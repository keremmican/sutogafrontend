import { Helmet } from 'react-helmet-async';
import PhoneInput from 'react-phone-input-2'
import 'react-phone-input-2/lib/style.css'
import { styled } from '@mui/material/styles';
import { useDispatch } from 'react-redux';
import { setToken, setAuthenticated, setUserName } from '../actions/authActions';
import * as React from 'react';
import {
    Container,
    Typography,
    Divider,
    Stack,
    Button,
    TextField,
    InputAdornment,
    IconButton, Checkbox, Select, MenuItem, Box, Snackbar
} from '@mui/material';
import {useNavigate} from "react-router-dom";
import {useEffect, useRef, useState} from "react";
import {Alert, LoadingButton} from "@mui/lab";
import axios from "axios";
import Iconify from "../components/iconify";
import LoadingScreen from "./LoadingScreen";

const StyledRoot = styled('div')(({ theme }) => ({
    [theme.breakpoints.up('md')]: {
        display: 'flex',
    },
}));

const StyledContent = styled('div')(({ theme }) => ({
    maxWidth: 480,
    margin: 'auto',
    minHeight: '100vh',
    display: 'flex',
    justifyContent: 'center',
    flexDirection: 'column',
}));

const BASE_URL = process.env.REACT_APP_URL

export default function RegisterPage() {
    const navigate = useNavigate();
    const ref = useRef();
    const [toastOpen, setToastOpen] = useState(false)
    const [showPassword, setShowPassword] = useState(false);
    const [success, setSuccess] = useState(false)

    const [steamId, setSteamId] = useState();

    const [userName, setUserName] = useState("");
    const [email, setEmail] = useState("");
    const [pwd, setPwd] = useState("");
    const [birthDate, setBirthDate] = useState("");
    const [phoneNumber, setPhoneNumber] = useState(0);
    const [firstName, setFirstName] = useState("");
    const [lastName, setLastName] = useState("");

    const [loading, setLoading] = useState(true);
    const [userData, setUserData] = useState(null);

    const [snackbarOpen, setSnackbarOpen] = useState(false);
    const [snackbarSeverity, setSnackbarSeverity] = useState('');
    const [snackbarMessage, setSnackbarMessage] = useState('');

    const { ipcRenderer } = window.electron;
    const dispatch = useDispatch();

    useEffect(() => {
        const urlParams = new URLSearchParams(window.location.search);
        const steamIdFromUrl = urlParams.get('steamid');
        if (steamIdFromUrl) {
            setSteamId(steamIdFromUrl);
            axios
                .post(`${BASE_URL}auth/steamLogin/${steamIdFromUrl}`)
                .then(async (response) => {
                    if (response.data) {
                        const credentials = {
                            userId: response.data.userId,
                            username: response.data.username,
                        };

                        if (response.data.token) {
                            credentials.token = response.data.token;
                        }

                        try {
                            await ipcRenderer.invoke('setCredentials', credentials);

                            if (response.data.token) {
                                await navigate('/home', { replace: true });
                            } else {
                                setLoading(false);
                            }
                        } catch (error) {
                            console.error('Error storing credentials:', error);
                        }
                    } else {
                        setLoading(false);
                    }
                })
                .catch(() => {
                    setLoading(false);
                });
        } else {
            setLoading(false);
        }
    }, [dispatch]);

    const [feedbackList, setFeedbackList] = useState({
        firstName: [firstName, false, "", 2],
        lastName: [lastName, false, "", 2],
        email: [email, false, "", 10],
        username: [userName, false, "", 3, 15],
        pwd: [pwd, false, "", 8],
        phoneNumber: [phoneNumber, false, "", 2],
        birthDate: [birthDate, false, "", 2]})

    function validation(e){

        let tempFeedbackList = {
            firstName: [firstName, false, "Enter your name", 2],
            lastName: [lastName, false, "Enter your last name", 2],
            email: [email, false, "Enter a valid email adress", 10],
            username: [userName, false, "Enter a valid username (min 3, max 15 characters)", 3, 15],
            pwd: [pwd, false, "Password must be 8 characters at least", 8],
            phoneNumber: [phoneNumber, false, "Enter a phone number", 2],
            birthDate: [birthDate, false, "", 2]}
        setFeedbackList(tempFeedbackList);

        let count = 0;

        for (let key in tempFeedbackList) {
            if (tempFeedbackList[key][0] === '' && e === "submit" || tempFeedbackList[key][0].length < tempFeedbackList[key][3] && e === "dynamic" && tempFeedbackList[key][0].length > 0) {
                tempFeedbackList[key][1] = true;
                setFeedbackList(tempFeedbackList);
                count++;
            } else if(key !== 'emailInput') {
                tempFeedbackList[key][1] = false;
            }
        }

        return count === 0;
    }

    useEffect(() => {
        validation('dynamic')
    }, [firstName, lastName, userName, pwd])

    useEffect(() => {
        const urlParams = new URLSearchParams(window.location.search);
        const steamIdFromUrl = urlParams.get('steamid');
        if (steamIdFromUrl) {
            setSteamId(steamIdFromUrl);
        }
    }, []);

    const handleClick = async (e) => {
        e.preventDefault();

        if (!validation("submit")) {
            setSuccess(false)
            return;
        }

        const steam = await window.electron.ipcRenderer.invoke('getSteamId');

        console.log(steam)

        try {
            const signuprequest = JSON.stringify({
                firstName: firstName,
                lastName: lastName,
                username: userName,
                email: email,
                password: pwd,
                phoneNumber: phoneNumber,
                birthDate: birthDate,
                steamId: steam
            });

            const response = axios.post(`${BASE_URL}auth/register`, signuprequest, {
                headers: { 'Content-Type': 'application/json' },
            });

            let data;
            await response.then((result) => {
                data = result.data;
                return data;
            });

            // credentials are set here
            await window.electron.ipcRenderer.invoke('setCredentials', {
                token: data.token,
                userId: data.userId,
                username: userName,
                steamId: steam,
            });

            await axios.post(`${BASE_URL}games/startFetchUserGames/${data.userId}`, null, {
                headers: { 'Authorization': `${data.token}` },
            });

            setSuccess(true);
            setToastOpen(true);
            navigate('/login', { replace: true });
        } catch(err) {
            await window.electron.ipcRenderer.invoke('deleteSteamId');
            console.log("error")
        }
    }

    const handleClose = (event: React.SyntheticEvent | Event, reason?: string) => {
        if (reason === 'clickaway') {
            return;
        }

        setToastOpen(false);
    };

    const handleBack = () => {
        navigate('/login', {replace: true})
    }

    function handleKeyUp(event) {
        if (event.keyCode === 13) {
            handleClick();
        }
    }

    if (loading) {
        return <LoadingScreen />;
    }

    return(
        <>
        <Helmet>
            <title> Register | Sutoga </title>
        </Helmet>
            <Snackbar open={snackbarOpen} autoHideDuration={3000} onClose={() => setSnackbarOpen(false)}>
                <Alert onClose={() => setSnackbarOpen(false)} severity={snackbarSeverity} sx={{ width: '100%' }}>
                    {snackbarMessage}
                </Alert>
            </Snackbar>

            <Snackbar open={toastOpen} autoHideDuration={3000} onClose={handleClose}>
                <Alert onClose={handleClose} severity="error" sx={{ width: '100%' }}>
                    Error
                </Alert>
            </Snackbar>

        <StyledRoot>
            <Container maxWidth="sm">
                <StyledContent>
                    <Typography variant="h4" gutterBottom sx={{mb: 3}}>
                        Sign up to Sutoga
                    </Typography>

                <Stack spacing={3}>

                    <Stack direction="row" spacing={2}>
                        <TextField sx={{width: "100%"}} name="firstName" label="First Name" onChange={(e) => setFirstName(e.target.value)}
                                   required error={feedbackList['firstName'][1]}/>

                        <TextField sx={{width: "100%"}} name="lastName" label="Last Name" onChange={(e) => setLastName(e.target.value)}
                                    required error={feedbackList['lastName'][1]}/>
                    </Stack>

                    <TextField name="username" label="Username" onChange={(e) => setUserName(e.target.value)}
                               required error={feedbackList['username'][1]}
                               />

                    <TextField name="email" label="Email address" onChange={(e) => setEmail(e.target.value)}
                               required error={feedbackList['email'][1]}
                               />

                    <TextField
                        name="password"
                        label="Password"
                        type={showPassword ? 'text' : 'password'}
                        onChange={(e) => setPwd(e.target.value)}
                        required error={feedbackList['pwd'][1]}
                        InputProps={{
                            endAdornment: (
                                <InputAdornment position="end">
                                    <IconButton onClick={() => setShowPassword(!showPassword)} edge="end">
                                        <Iconify icon={showPassword ? 'eva:eye-fill' : 'eva:eye-off-fill'} />
                                    </IconButton>
                                </InputAdornment>
                            ),
                        }}
                    />

                    <Stack direction="row" spacing={2}>
                        <TextField
                            id="date"
                            label="Birthday"
                            type="date"
                            defaultValue="2000-01-01"
                            sx={{ width: 250 }}
                            required error={feedbackList['birthDate'][1]}
                            onChange={(e) => setBirthDate(e.target.value)}
                            InputLabelProps={{
                                shrink: true,
                            }}
                        />

                        <Box sx={{ flexGrow: 1 }} />

                        <PhoneInput
                            country={"tr"}
                            inputStyle={{ borderRadius: "13px", height: "100%", width: "100%" }}
                            value={phoneNumber}
                            onChange={(e) => setPhoneNumber(e)}
                        />
                    </Stack>

                </Stack>

                <Stack direction={"row"}>
                    <Button fullWidth size="large" variant="contained" sx={{mt: 2, mr: 3}} onClick={handleBack}>
                        Back
                    </Button>

                    <LoadingButton fullWidth size="large" type="submit" variant="contained" onClick={handleClick} onKeyUp={handleKeyUp} sx={{mt: 2}}>
                        Sign Up
                    </LoadingButton>
                </Stack>
                </StyledContent>
            </Container>
        </StyledRoot>
        </>
    )
}