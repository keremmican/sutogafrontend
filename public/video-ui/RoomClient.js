const mediaType = {
  audio: 'audioType',
  video: 'videoType',
  screen: 'screenType'
}
const _EVENTS = {
  exitRoom: 'exitRoom',
  openRoom: 'openRoom',
  startVideo: 'startVideo',
  stopVideo: 'stopVideo',
  startAudio: 'startAudio',
  stopAudio: 'stopAudio',
  startScreen: 'startScreen',
  stopScreen: 'stopScreen'
}

class RoomClient {
  constructor(localMediaEl, remoteVideoEl, remoteAudioEl, mediasoupClient, socket, room_id, name, successCallback) {
    this.name = name
    this.localMediaEl = localMediaEl
    this.remoteVideoEl = remoteVideoEl
    this.remoteAudioEl = remoteAudioEl
    this.mediasoupClient = mediasoupClient

    this.socket = socket
    this.producerTransport = null
    this.consumerTransport = null
    this.device = null
    this.room_id = room_id

    this.isVideoOnFullScreen = false
    this.isDevicesVisible = false

    this.consumers = new Map()
    this.producers = new Map()

    console.log('Mediasoup client', mediasoupClient)

    /**
     * map that contains a mediatype as key and producer_id as value
     */
    this.producerLabel = new Map()

    this._isOpen = false
    this.eventListeners = new Map()

    Object.keys(_EVENTS).forEach(
      function (evt) {
        this.eventListeners.set(evt, [])
      }.bind(this)
    )

    this.createRoom(room_id).then(
      async function () {
        await this.join(name, room_id)
        this.initSockets()
        this._isOpen = true
        successCallback()
      }.bind(this)
    )
  }

  ////////// INIT /////////

  async createRoom(room_id) {
    await this.socket
      .request('createRoom', {
        room_id
      })
      .catch((err) => {
        console.log('Create room error:', err)
      })
  }

  async join(name, room_id) {
    socket
      .request('join', {
        name,
        room_id
      })
      .then(
        async function (e) {
          console.log('Joined to room', e)
          const data = await this.socket.request('getRouterRtpCapabilities')
          let device = await this.loadDevice(data)
          this.device = device
          await this.initTransports(device)
          this.socket.emit('getProducers')
        }.bind(this)
      )
      .catch((err) => {
        console.log('Join error:', err)
      })
  }

  async loadDevice(routerRtpCapabilities) {
    let device
    try {
      device = new this.mediasoupClient.Device()
    } catch (error) {
      if (error.name === 'UnsupportedError') {
        console.error('Browser not supported')
        alert('Browser not supported')
      }
      console.error(error)
    }
    await device.load({
      routerRtpCapabilities
    })
    return device
  }

  async initTransports(device) {
    // init producerTransport
    {
      const data = await this.socket.request('createWebRtcTransport', {
        forceTcp: false,
        rtpCapabilities: device.rtpCapabilities
      })

      if (data.error) {
        console.error(data.error)
        return
      }

      this.producerTransport = device.createSendTransport(data)

      this.producerTransport.on(
        'connect',
        async function ({ dtlsParameters }, callback, errback) {
          this.socket
            .request('connectTransport', {
              dtlsParameters,
              transport_id: data.id
            })
            .then(callback)
            .catch(errback)
        }.bind(this)
      )

      this.producerTransport.on(
        'produce',
        async function ({ kind, rtpParameters }, callback, errback) {
          try {
            const { producer_id } = await this.socket.request('produce', {
              producerTransportId: this.producerTransport.id,
              kind,
              rtpParameters
            })
            callback({
              id: producer_id
            })
          } catch (err) {
            errback(err)
          }
        }.bind(this)
      )

      this.producerTransport.on(
        'connectionstatechange',
        function (state) {
          switch (state) {
            case 'connecting':
              break

            case 'connected':
              //localVideo.srcObject = stream
              break

            case 'failed':
              this.producerTransport.close()
              break

            default:
              break
          }
        }.bind(this)
      )
    }

    // init consumerTransport
    {
      const data = await this.socket.request('createWebRtcTransport', {
        forceTcp: false
      })

      if (data.error) {
        console.error(data.error)
        return
      }

      // only one needed
      this.consumerTransport = device.createRecvTransport(data)
      this.consumerTransport.on(
        'connect',
        function ({ dtlsParameters }, callback, errback) {
          this.socket
            .request('connectTransport', {
              transport_id: this.consumerTransport.id,
              dtlsParameters
            })
            .then(callback)
            .catch(errback)
        }.bind(this)
      )

      this.consumerTransport.on(
        'connectionstatechange',
        async function (state) {
          switch (state) {
            case 'connecting':
              break

            case 'connected':
              //remoteVideo.srcObject = await stream;
              //await socket.request('resume');
              break

            case 'failed':
              this.consumerTransport.close()
              break

            default:
              break
          }
        }.bind(this)
      )
    }
  }

  initSockets() {
    this.socket.on(
      'consumerClosed',
      function ({ consumer_id }) {
        console.log('Closing consumer:', consumer_id)
        this.removeConsumer(consumer_id)
      }.bind(this)
    )

    /**
     * data: [ {
     *  producer_id:
     *  producer_socket_id:
     * }]
     */
    this.socket.on('newProducers', async function (data) {
      console.log('New producers', data)
      for (let { producer_id, producer_socket_id, producer_name } of data) {
        console.log(producer_id, producer_socket_id, producer_name)
        await this.consume(producer_id, producer_name)
      }
    }.bind(this))
    this.socket.on(
      'disconnect',
      function () {
        this.exit(true)
      }.bind(this)
    )
  }

  //////// MAIN FUNCTIONS /////////////

  async produce(type, deviceId = null) {
    let mediaConstraints = {}
    let audio = false
    let screen = false
    switch (type) {
      case mediaType.audio:
        mediaConstraints = {
          audio: {
            deviceId: deviceId
          },
          video: false
        }
        audio = true
        break
      case mediaType.video:
        mediaConstraints = {
          audio: false,
          video: {
            width: {
              min: 640,
              ideal: 1920
            },
            height: {
              min: 400,
              ideal: 1080
            },
            deviceId: deviceId
            /*aspectRatio: {
                            ideal: 1.7777777778
                        }*/
          }
        }
        break
      case mediaType.screen:
        mediaConstraints = false
        screen = true
        break
      default:
        return
    }
    if (!this.device.canProduce('video') && !audio) {
      console.error('Cannot produce video')
      return
    }
    if (this.producerLabel.has(type)) {
      console.log('Producer already exists for this type ' + type)
      return
    }
    console.log('Mediacontraints:', mediaConstraints)
    let stream
    try {
      stream = screen
        ? await navigator.mediaDevices.getDisplayMedia()
        : await navigator.mediaDevices.getUserMedia(mediaConstraints)
      console.log(navigator.mediaDevices.getSupportedConstraints())

      const track = audio ? stream.getAudioTracks()[0] : stream.getVideoTracks()[0]
      const params = {
        track
      }
      if (!audio && !screen) {
        params.encodings = [
          {
            rid: 'r0',
            maxBitrate: 100000,
            //scaleResolutionDownBy: 10.0,
            scalabilityMode: 'S3T3'
          },
          {
            rid: 'r1',
            maxBitrate: 300000,
            scalabilityMode: 'S3T3'
          },
          {
            rid: 'r2',
            maxBitrate: 900000,
            scalabilityMode: 'S3T3'
          }
        ]
        params.codecOptions = {
          videoGoogleStartBitrate: 1000
        }
      }
      producer = await this.producerTransport.produce(params)

      console.log('Producer', producer)

      this.producers.set(producer.id, producer)

      let elem
      if (!audio) {
        let containerElem = document.createElement('div'); // Yeni div elementi oluşturduk.
        containerElem.className = 'producer-container'; // Div elementine bir class atadık.

        let idElem = document.createElement('p');
        idElem.innerText = "You";
        idElem.id = 'you';
        idElem.className = 'producer-id';

        elem = document.createElement('video');
        elem.srcObject = stream;
        elem.id = producer.id;
        elem.playsinline = false;
        elem.autoplay = true;
        elem.className = 'vid';

        containerElem.appendChild(idElem); // idElem ve elem'i containerElem div'inin içine ekledik.
        containerElem.appendChild(elem);

        this.localMediaEl.appendChild(containerElem); // localMediaEl'e artık sadece containerElem'i ekliyoruz.
        this.handleFS(elem.id);
      }

      producer.on('trackended', () => {
        this.closeProducer(type)
      })

      producer.on('transportclose', () => {
        console.log('Producer transport close')
        if (!audio) {
          elem.srcObject.getTracks().forEach(function (track) {
            track.stop()
          })
          elem.parentNode.removeChild(elem)
        }
        this.producers.delete(producer.id)
      })

      producer.on('close', () => {
        console.log('Closing producer')
        if (!audio) {
          elem.srcObject.getTracks().forEach(function (track) {
            track.stop()
          })
          elem.parentNode.removeChild(elem)
        }
        this.producers.delete(producer.id)
      })

      this.producerLabel.set(type, producer.id)

      switch (type) {
        case mediaType.audio:
          this.event(_EVENTS.startAudio)
          break
        case mediaType.video:
          this.event(_EVENTS.startVideo)
          break
        case mediaType.screen:
          this.event(_EVENTS.startScreen)
          break
        default:
          return
      }
    } catch (err) {
      console.log('Produce error:', err)
    }
  }

  async consume(producer_id,name) {
    this.getConsumeStream(producer_id).then(
        function ({ consumer, stream, kind }) {
          this.consumers.set(consumer.id, consumer)

          let elem
          if (kind === 'video') {
            // Create a new div to hold the video and the ID
            let videoContainer = document.createElement('div');
            videoContainer.className = 'video-container';

            // Create the video element as before
            elem = document.createElement('video')
            elem.srcObject = stream
            elem.id = consumer.id
            elem.playsinline = false
            elem.autoplay = true
            elem.className = 'vid'

            // Add the video element to the container
            let idElem = document.createElement('p');
            idElem.innerText = name;
            idElem.id = 'producer-name-' + consumer.id; // assign a unique id
            idElem.className = 'producer-id';
            videoContainer.appendChild(idElem);


            videoContainer.appendChild(elem);



            this.remoteVideoEl.appendChild(videoContainer)
            this.handleFS(elem.id)
        } else {
          elem = document.createElement('audio')
          elem.srcObject = stream
          elem.id = consumer.id
          elem.playsinline = false
          elem.autoplay = true
          this.remoteAudioEl.appendChild(elem)
        }

        consumer.on(
          'trackended',
          function () {
            this.removeConsumer(consumer.id)
          }.bind(this)
        )

        consumer.on(
          'transportclose',
          function () {
            this.removeConsumer(consumer.id)
          }.bind(this)
        )
      }.bind(this)
    )
  }

  async getConsumeStream(producerId) {
    const { rtpCapabilities } = this.device
    const data = await this.socket.request('consume', {
      rtpCapabilities,
      consumerTransportId: this.consumerTransport.id, // might be
      producerId
    })
    const { id, kind, rtpParameters } = data

    let codecOptions = {}
    const consumer = await this.consumerTransport.consume({
      id,
      producerId,
      kind,
      rtpParameters,
      codecOptions
    })

    const stream = new MediaStream()
    stream.addTrack(consumer.track)

    return {
      consumer,
      stream,
      kind
    }
  }

  closeProducer(type) {
    if (!this.producerLabel.has(type)) {
      console.log('There is no producer for this type ' + type)
      return
    }

    let producer_id = this.producerLabel.get(type)
    console.log('Close producer', producer_id)

    this.socket.emit('producerClosed', {
      producer_id
    })

    this.producers.get(producer_id).close()
    this.producers.delete(producer_id)
    this.producerLabel.delete(type)

    if (type !== mediaType.audio) {
      let elem = document.getElementById(producer_id)
      elem.srcObject.getTracks().forEach(function (track) {
        track.stop()
      })
      // remove the name element

      // remove the video element
      // remove the video element
      elem.parentNode.removeChild(elem)

    }
    let nameElem = document.getElementById('you');
    if(nameElem){
      nameElem.remove();

    }


    switch (type) {
      case mediaType.audio:
        this.event(_EVENTS.stopAudio)
        break
      case mediaType.video:
        this.event(_EVENTS.stopVideo)
        break
      case mediaType.screen:
        this.event(_EVENTS.stopScreen)
        break
      default:
        return
    }
  }

  pauseProducer(type) {
    if (!this.producerLabel.has(type)) {
      console.log('There is no producer for this type ' + type)
      return
    }

    let producer_id = this.producerLabel.get(type)
    this.producers.get(producer_id).pause()
  }

  resumeProducer(type) {
    if (!this.producerLabel.has(type)) {
      console.log('There is no producer for this type ' + type)
      return
    }

    let producer_id = this.producerLabel.get(type)
    this.producers.get(producer_id).resume()
  }

  removeConsumer(consumer_id) {
    let elem = document.getElementById(consumer_id)
    elem.srcObject.getTracks().forEach(function (track) {
      track.stop()
    })
    elem.parentNode.removeChild(elem)

    let nameElem = document.getElementById('producer-name-' + consumer_id);
    if(nameElem){
      nameElem.remove();

    }



    this.consumers.delete(consumer_id)
  }

  exit(offline = false) {
    let clean = function () {
      this._isOpen = false
      this.consumerTransport.close()
      this.producerTransport.close()
      this.socket.off('disconnect')
      this.socket.off('newProducers')
      this.socket.off('consumerClosed')
    }.bind(this)

    if (!offline) {
      this.socket
        .request('exitRoom')
        .then((e) => console.log(e))
        .catch((e) => console.warn(e))
        .finally(
          function () {
            clean()
          }.bind(this)
        )
    } else {
      clean()
    }

    this.event(_EVENTS.exitRoom)
  }

  ///////  HELPERS //////////

  async roomInfo() {
    let info = await this.socket.request('getMyRoomInfo')
    return info
  }

  static get mediaType() {
    return mediaType
  }

  event(evt) {
    if (this.eventListeners.has(evt)) {
      this.eventListeners.get(evt).forEach((callback) => callback())
    }
  }

  on(evt, callback) {
    this.eventListeners.get(evt).push(callback)
  }

  //////// GETTERS ////////

  isOpen() {
    return this._isOpen
  }

  static get EVENTS() {
    return _EVENTS
  }

  //////// UTILITY ////////

  copyURL() {
    let tmpInput = document.createElement('input')
    document.body.appendChild(tmpInput)
    tmpInput.value = window.location.href
    tmpInput.select()
    document.execCommand('copy')
    document.body.removeChild(tmpInput)
    console.log('URL copied to clipboard ðŸ‘')
  }

  showDevices() {
    if (!this.isDevicesVisible) {
      reveal(devicesList)
      this.isDevicesVisible = true
    } else {
      hide(devicesList)
      this.isDevicesVisible = false
    }
  }

  handleFS(id) {
    let videoPlayer = document.getElementById(id);

    // Utility function to handle fullscreen mode
    const toggleFullScreen = () => {
      if (!document.fullscreenElement && !document.webkitIsFullScreen) {
        if (videoPlayer.requestFullscreen) {
          videoPlayer.requestFullscreen();
        } else if (videoPlayer.webkitRequestFullscreen) {
          videoPlayer.webkitRequestFullscreen();
        }
      } else {
        if (document.exitFullscreen) {
          document.exitFullscreen();
        } else if (document.webkitCancelFullScreen) {
          document.webkitCancelFullScreen();
        }
      }
    };

    videoPlayer.addEventListener('click', toggleFullScreen);
  }

}
