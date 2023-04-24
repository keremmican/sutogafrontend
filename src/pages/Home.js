import { Helmet } from 'react-helmet-async';
import React, {useState, useEffect} from "react";
// @mui
import {alpha, useTheme} from '@mui/material/styles';
import {
    Grid,
    Container,
    Stack,
    Button,
    TextField,
    ClickAwayListener, Collapse, InputAdornment, IconButton
} from '@mui/material';
// components
import {useSelector} from "react-redux";
import axios from "axios";
import Iconify from '../components/iconify';
import PostCard from "../components/cards/PostCard";
import FriendRecCard from "../components/cards/FriendRecCard";

const BASE_URL = process.env.REACT_APP_URL

export default function Home() {
    const theme = useTheme();
    const userName = useSelector((state)=> state.auth.userName);
    const [friendRec, setFriendRec] = useState([])

    const [openCreate, setOpenCreate] = useState(false);
    const [collapse, setCollapse] = useState(false);
    const [row, setRow] = useState(1);
    const [hideLabel, setHideLabel] = useState(false);
    const [isInputOpen, setIsInputOpen] = useState(false);
    const [canSend, setCanSend] = useState(false);

    const [postLabel, setPostLabel] = useState("What's happening?")
    const [postText, setPostText] = useState("");
    const friendData = [0,0,0]

    const [windowSize, setWindowSize] = useState(getWindowSize());

    useEffect(() => {
        getFriendRecs()
    }, [])

    useEffect(() => {
        function handleWindowResize() {
            setWindowSize(getWindowSize());
        }

        window.addEventListener('resize', handleWindowResize);

        return () => {
            window.removeEventListener('resize', handleWindowResize);
        };
    }, []);

    function getWindowSize() {
        const {innerWidth, innerHeight} = window;
        return {innerWidth, innerHeight};
    }

    const handleClickCreate = () => {
        setRow(4)
        setCollapse(false)
        setCollapse(true)
        setOpenCreate(true);
        setIsInputOpen(true)
    };

    const handleClickAway = () => {
        setRow(1)
        setOpenCreate(false);
        setCollapse(true);
        setCollapse(false);
        setIsInputOpen(false);
    };

    const handleWrite = (e) => {
        if (e !== "") {
            setPostLabel("")
            setCanSend(true)
        } else {
            setPostLabel("What's happening?")
            setCanSend(false)
        }
    }

    const handlePost = () => {

    }

    const getFriendRecs = async () => {
        try {
            const recresponse = axios.get(`${BASE_URL  }users/getFriendRecommendations?userId=${  19}`)

            // eslint-disable-next-line no-unused-vars
            let data;
            await recresponse.then((result) => {
                // eslint-disable-next-line no-return-assign,prefer-destructuring
                return data = result.data;
            })
            setFriendRec(data)
        } catch (e) {
            console.log(e)
        }
    }

    return(
        <>
            <Helmet>
                <title> Home </title>
            </Helmet>

            <Grid container columns={16} direction="column">
                <Stack direction="row">
                    <Grid container xs={12} alignItems="center"
                          justifyContent="center">
                        <ClickAwayListener onClickAway={handleClickAway}>
                            <Grid item sx={{pb: 1}}>
                                <Collapse in={collapse} collapsedSize={100}>
                                    <TextField
                                        InputLabelProps={{shrink: false}}
                                        hiddenLabel={hideLabel}
                                        name="create_field"
                                        label={postLabel}
                                        onClick={handleClickCreate}
                                        sx={{minWidth: 700}}
                                        multiline focused={false} rows={row} fullWidth
                                        onChange={(e) => {
                                            setPostText(e.target.value)
                                            handleWrite(e.target.value)
                                        }}
                                        InputProps={{
                                        endAdornment: (
                                            <>
                                                {isInputOpen ? (
                                                    <Grid container xs={1} direction={"column"}>
                                                        <IconButton edge="end" color="black">
                                                            <Iconify icon={"material-symbols:broken-image-outline"} />
                                                        </IconButton>
                                                        <IconButton edge="end" color={canSend ? ("primary") : ("black")} disabled={!canSend} onClick={handlePost}>
                                                            <Iconify icon={canSend ? ("material-symbols:arrow-circle-right") : ("material-symbols:arrow-circle-right-outline")} />
                                                        </IconButton>
                                                    </Grid>
                                                ) : (
                                                    <InputAdornment position={"end"}>
                                                        <IconButton edge="end" color="black">
                                                            <Iconify icon={"material-symbols:broken-image-outline"} />
                                                        </IconButton>
                                                    </InputAdornment>
                                                    )}
                                            </>
                                        ),
                                    }}
                                    />
                                </Collapse>
                            </Grid>
                        </ClickAwayListener>

                        <Grid item spacing={2}>
                            <PostCard img="https://i.ytimg.com/vi/WSwUSIfgA4M/maxresdefault.jpg"/>
                            <PostCard img="https://cdn.motor1.com/images/mgl/2Np2Qp/s1/need-for-speed-unbound-gameplay-trailer.jpg" />
                            <PostCard img="https://wallpapers.com/images/file/spider-man-action-adventure-1080p-gaming-6psueyj01802y9f1.jpg" />
                        </Grid>
                    </Grid>
                </Stack>
            </Grid>

        </>
    );
}