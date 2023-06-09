const { app, BrowserWindow, screen, ipcMain, dialog , desktopCapturer, systemPreferences} = require('electron');
const path = require('path');
const axios = require('axios');
//const isDev = require('electron-is-dev');
const isDev = app.isPackaged ? false : require('electron-is-dev');
const Store = require('electron-store');
const express = require('express');
const passport = require('passport');
const SteamStrategy = require('passport-steam').Strategy;
const session = require('express-session');
const { URL } = require('url');

const store = new Store();
const fs = require('fs');

let win;
const BASE_URL = process.env.REACT_APP_URL

const getAssetsPath = () => {
    if (isDev) {
        // Geliştirme ortamında, proje kök dizinindeki 'public/assets' yolunu döndürür
        return path.join(app.getAppPath(), 'public', 'assets');
    } else {
        // Dağıtımda, uygulamanın çalıştığı dizindeki 'public/assets' yolunu döndürür
        return path.join(__dirname, 'public', 'assets');
    }
};

ipcMain.handle('get-assets-path', (event) => {
    const assetsPath = getAssetsPath();
    return assetsPath;
});


const steamAuthApp = express();
steamAuthApp.use(session({
    secret: '4D3BE17D82F44DE7727A8287A7F0F869',  // Replace 'your_secret_key' with your actual secret key
    resave: false,
    saveUninitialized: true,
    cookie: { secure: false }  // Set this to true if you're using HTTPS
}));
steamAuthApp.use(passport.initialize());
steamAuthApp.use(passport.session());

passport.use(new SteamStrategy({
            returnURL: 'http://localhost:3001/auth/steam/return',
            realm: 'http://localhost:3001/',
            apiKey: '4D3BE17D82F44DE7727A8287A7F0F869'
        },
        (identifier, profile, done) => {
            profile.identifier = identifier;
            return done(null, profile);
        })
);

steamAuthApp.get('/auth/steam', passport.authenticate('steam'));


steamAuthApp.get(
    '/auth/steam/return',
    passport.authenticate('steam', { failureRedirect: 'http://localhost:3000/login' }),
    (req, res) => {
        const { _json: { steamid } } = req.user;
        console.log('Authentication successful');
        res.redirect(`http://localhost:3000/register?steamid=${steamid}`);
    }
);
steamAuthApp.use('/video',express.static(path.join(__dirname, './', 'video-ui')))

steamAuthApp.listen(3001);

passport.serializeUser(function(user, done) {
    done(null, user);
});

passport.deserializeUser(function(user, done) {
    done(null, user);
});

ipcMain.handle('check-file-exists', async (event, path) => {
    return fs.existsSync(path);
});

ipcMain.handle('get-file-data', async (event, filePath) => {
    const data = fs.readFileSync(filePath);
    return data;
});

if (isDev) {
    // eslint-disable-next-line global-require
    require('electron-reloader')(module, {
        watchRenderer: true,
    });
}

ipcMain.handle('open-devtools', async (event) => {
    BrowserWindow.getFocusedWindow().webContents.openDevTools();
});


ipcMain.handle('open-file-dialog', async (event, options) => {
    const result = await dialog.showOpenDialog(options);
    return result.filePaths;
});

ipcMain.handle('getStore', () => {
    // Return the Electron store instance to the renderer process
    return store;
});

ipcMain.handle('getUsername', () => {
    // Return only the username from the Electron store instance
    return store.get('username');
});

ipcMain.handle('getSteamId', () => {
    return store.get("steamid")
})

ipcMain.handle('getId', () => {
    // Return only the username from the Electron store instance
    return store.get('userId');
});

ipcMain.handle('getToken', () => {
    // Return only the username from the Electron store instance
    return store.get('token');
});

ipcMain.handle('setSteamId', async (event, steamId) => {
    store.set('steamid', steamId);
});

ipcMain.handle('deleteSteamId', async (event) => {
    store.delete('steamid');
});


ipcMain.handle('setCredentials', async (event, { token, userId, username, steamId }) => {
    if (token !== null && token !== undefined) {
        store.set('token', token);
    } else {
        store.delete('token');
    }

    if (userId !== null && userId !== undefined) {
        store.set('userId', userId);
    } else {
        store.delete('userId');
    }

    if (username !== null && username !== undefined) {
        store.set('username', username);
    } else {
        store.delete('username');
    }

    if (steamId !== null && steamId !== undefined) {
        store.set('steamid', steamId);
    } else {
        store.delete('steamid');
    }
});

ipcMain.on('open-url', (event, url) => {
    let win = new BrowserWindow({
        width: 1300,
        height: 800,
        webPreferences: {
            contextIsolation: true,
            nodeIntegration: false,
            preload: path.join(__dirname, 'preload.js'),
            worldSafeExecuteJavaScript: true,
            contentSecurityPolicy: "default-src 'self'; script-src 'self' 'unsafe-inline'"
        },
    });
    win.loadURL(url);
});

ipcMain.handle('getCredentials', async () => {
    const token = store.get('token');
    const userId = store.get('userId');
    const userName = store.get('username');
    const steamId = store.get('steamid');

    return { token, userId, userName, steamId };
});

ipcMain.handle('clearCredentials', async () => {
    store.delete('token');
    store.delete('userId');
    store.delete('username');
    store.delete('steamid');
});

ipcMain.handle('logout', async () => {
    console.log("Logout called in main process");
    store.delete('token');
    store.delete('userId');
    store.delete('username');
    store.delete('steamid');

    const allWindows = BrowserWindow.getAllWindows();
    if(allWindows.length) {
        const win = allWindows[0];
        const cookies = await win.webContents.session.cookies.get({});
        cookies.forEach((cookie) => {
            if (cookie.name.includes('steamLogin')) {
                win.webContents.session.cookies.remove(cookie.domain, cookie.name);
            }
        });
    }
    return "Logged out";
});

ipcMain.handle('get-window-size', (event) => {
    return win.getSize();
});

ipcMain.handle('deleteCookie', async () => {
    const { session } = require('electron')

    const url = 'http://localhost:3001';
    const cookieName = 'steamLogin';

    return session.defaultSession.cookies.remove(url, cookieName)
        .then(() => {
            console.log('Cookie is deleted');
        })
        .catch((error) => {
            console.error('Error deleting cookie:', error);
        });
});


ipcMain.handle('open-auth-window', async () => {
    const authWindow = new BrowserWindow({
        width: 800,
        height: 600,
        webPreferences: {
            nodeIntegration: false,
            contextIsolation: true,
        },
    });

    authWindow.loadURL('http://localhost:3001/auth/steam');

    return new Promise((resolve, reject) => {
        authWindow.webContents.on('did-navigate', () => {
            const { session } = authWindow.webContents;
            session.cookies
                .get({})
                .then((cookies) => {
                    if (cookies.length > 0) {
                        const steamCookie = cookies.find(cookie => cookie.name.includes('steamLogin'));
                        if (steamCookie) {
                            const steamid = steamCookie.value.split('%')[0];
                            store.set('steamid', steamid);
                            authWindow.close();
                            resolve(steamid);
                        } else {
                            resolve(null);
                        }
                    }
                })
                .catch((error) => {
                    console.error(error);
                    reject(error);
                });
        });
    });
});

function createWindow() {
    const { width: screenWidth, height: screenHeight } = screen.getPrimaryDisplay().workAreaSize;

    // Calculate the initial window size based on the screen size
    const windowWidth = Math.round(screenWidth * 0.8); // Set width to 80% of the screen width
    const windowHeight = Math.round(screenHeight * 0.8); // Set height to 80% of the screen height

    win = new BrowserWindow({
        width: windowWidth,
        height: windowHeight, // Adjust height as needed
        minWidth: 1300, // Set minimum width (optional)
        minHeight: 800, // Set minimum height (optional)
        webPreferences: {
            nodeIntegration: false,
            contextIsolation: true,
            //preload: path.join(app.getAppPath(), 'public', 'preload.js'), //devdeyken çalışan
            //preload: path.join(app.getAppPath(), 'build', 'preload.js'), // winde setupla çalışan
            preload: path.join(__dirname, 'preload.js'), // burası mevcut preload script'inizin yolu olmalı
            contentSecurityPolicy: "default-src 'self'; script-src 'self' 'unsafe-inline'",
            webSecurity: false,
            nodeIntegrationInWorker: true
        },
    });

    win.webContents.on('will-navigate', (event, url) => {
        const urlObj = new URL(url);
        const steamid = urlObj.searchParams.get('steamid');
        if (steamid) {
            // Save steamid in the Electron store
            store.set('steamid', steamid);
            // Prevent the actual navigation
            event.preventDefault();
            // Load the app page without the query parameter
            win.loadURL(`file://${path.join(__dirname, '../build/index.html')}`);
        }
    });

    win.webContents.on('did-finish-load', () => {
        win.webContents.send('baseURL', BASE_URL);
    });

    //TODO prod ve dev'de burası kesinlikle değişiyior!

    // const url = isDev
    //     ? 'http://localhost:3000'
    //     : `file://${path.join(__dirname, '../build/index.html')}`;

    const url = `file://${path.join(__dirname, '../build/index.html')}`;

    win.on('resize', () => {
        win.webContents.send('window-resize', win.getSize());
    });

    if (!win.isDestroyed()) {
        win.loadURL(url);
    }
    //TODO unutma
    // win.webContents.on('did-finish-load', () => {
    //     win.webContents.openDevTools();
    // });
}

ipcMain.handle(
    'DESKTOP_CAPTURER_GET_SOURCES',
    (event, opts) => desktopCapturer.getSources(opts)
)

app.whenReady().then(async () => {
    if (process.platform === 'darwin') {
        const microphonePermission = await systemPreferences.askForMediaAccess('microphone');
        const cameraPermission = await systemPreferences.askForMediaAccess('camera');
        const screenPermission = await systemPreferences.askForMediaAccess('screen');

        if (!microphonePermission || !cameraPermission || !screenPermission) {
            console.error('Kamera, mikrofon ve ekran paylaşımı izinleri verilmedi.');
        }
    }

    createWindow();
});

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit();
    }
});

app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
        createWindow();
    }
});