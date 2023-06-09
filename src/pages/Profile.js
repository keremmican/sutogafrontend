import { Helmet } from 'react-helmet-async';
import React, {useState, useEffect} from "react";
// @mui
import {useTheme} from '@mui/material/styles';
import {Alert} from "@mui/lab";
import {
    Grid,
    Typography,
    Card,
    Box,
    CardContent,
    Avatar,
    Snackbar,
    Stack,
    Button,
    Tabs, Tab, DialogTitle, Dialog, DialogActions, DialogContent, TextField, FormControlLabel, Switch, FormGroup
} from '@mui/material';
// components
import {TabPanelProps} from "@mui/lab";
import GameCard from "../components/cards/GameCard";
import PostCardLeft from "../components/cards/PostCardLeft";
import useMediaQuery from "@mui/material/useMediaQuery";
import ProfileCardSm from "../components/cards/ProfileCardSm";
import axios from "axios";
import LoadingRow from "../components/loading/LoadingRow";
import InfiniteScroll from "react-infinite-scroll-component";
import PhoneInput from 'react-phone-input-2';
import 'react-phone-input-2/lib/style.css';
import {useNavigate} from "react-router-dom";
import { useDispatch } from 'react-redux';
import { setUserData } from '../actions/authActions';

const bgImage = `${process.env.PUBLIC_URL}/assets/images/bg.jpg`;
const { ipcRenderer } = window.electron;

function TabPanel(props: TabPanelProps) {
    const { children, value, index, ...other } = props;

    return (
        <div
            role="tabpanel"
            hidden={value !== index}
            id={`simple-tabpanel-${index}`}
            aria-labelledby={`simple-tab-${index}`}
            {...other}
        >
            {value === index && (
                <Box sx={{ p: 3 }}>
                    <Typography>{children}</Typography>
                </Box>
            )}
        </div>
    );
}

function a11yProps(index: number) {
    return {
        id: `simple-tab-${index}`,
        'aria-controls': `simple-tabpanel-${index}`,
    };
}

const BASE_URL = process.env.REACT_APP_URL

export default function Profile() {
    const theme = useTheme();
    const dispatch = useDispatch();
    const navigate = useNavigate();
    const [toastOpen, setToastOpen] = useState(false);
    const [tab, setTab] = useState(0);
    const [username, setUsername] = useState('');
    const isSmallScreen = useMediaQuery(theme.breakpoints.down('sm'));
    const [windowSize, setWindowSize] = useState([0, 0]);
    const [gamesLoading, setGamesLoading] = useState(true);

    const avatarSize = windowSize[0] < 1600 ? 200 : 250;
    const usernameFontSize = isSmallScreen ? '0.9rem' : '1.5rem';
    const [openEditProfile, setOpenEditProfile] = useState(false);
    const [openAccountSettings, setOpenAccountSettings] = useState(false);
    const cardHeight = windowSize[0] < 1600 ? 250 : 280

    const [loadingPosts, setLoadingPosts] = useState(false);
    const [loadingUser, setLoadingUser] = useState(true);
    const [hasMore, setHasMore] = useState(true);
    const [page, setPage] = useState(0);
    const [posts, setPosts] = useState([]);

    const [friendPage, setFriendPage] = useState(0)
    const [loadingFriend, setLoadingFriend] = useState(false)
    const [hasMoreFriends, setHasMoreFriends] = useState(true);

    const [games, setGames] = useState([])
    const [gamePage, setGamePage] = useState(0)
    const [loadingGame, setLoadingGame] = useState(false)

    const [likes, setLikes] = useState([])
    const [likePage, setLikePage] = useState(0)
    const [loadingLike, setLoadingLike] = useState(false)
    const [hasMoreLikes, setHasMoreLikes] = useState(true);

    const [user, setUser] = useState(null);

    const [currentPassword, setCurrentPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [isPrivateAccount, setIsPrivateAccount] = useState(false);

    const [snackbarMessage, setSnackbarMessage] = useState("")
    const [snackbarSeverity, setSnackbarSeverity] = useState(null)
    const [snackbarOpen, setSnackbarOpen] = useState(false)

    const [update, setUpdate] = useState(false)

    const [friends, setFriends] = useState([])

    const handleSnackbar = (message, severity) => {
        setSnackbarMessage(message);
        setSnackbarSeverity(severity);
        setSnackbarOpen(true);
    };

    const handleCloseSnackbar = () => {
        setSnackbarOpen(false);
    };

    useEffect(() => {
        switch (tab) {
            case 0:
                setLikes([])
                if (posts.length === 0) {
                    setHasMore(true);
                    setPage(0);
                    loadMorePosts();
                }
                break;
            case 2:
                setLikes([])
                if (games.length === 0) {
                    setGamePage(0);
                    getUserGames();
                }
                break;
            case 4:
                setLikePage(0);
                setHasMoreLikes(true)
                loadMoreLikes();
                break;
            case 6:
                setLikes([])
                if (friends.length === 0) {
                    setHasMoreFriends(true);
                    setFriendPage(0);
                    getFriends();
                }
                break;
        }
    }, [tab]);

    useEffect(() => {
        const fetchUser = async () => {
            try {
                const token = await window.electron.ipcRenderer.invoke("getToken");
                const userId = await window.electron.ipcRenderer.invoke("getId");

                const response = await axios.get(`${BASE_URL}users/${userId}`, {
                    headers: { 'Authorization': `${token}` },
                });

                const userData = response.data;
                setUser(userData);
                getPostCount()
                getFriendCount()
                getGameCount()
            } catch (error) {
                console.log("Error fetching user data:", error);
            } finally {
                setLoadingUser(false);
            }
        };

        fetchUser();
    }, [update]);

    useEffect(() => {
        if (friends.length && friends.length % 10 !== 0) {
            setHasMoreFriends(false);
        }
    }, [friends]);

    const getGameCount = async (id) => {
        try {
            const token = await window.electron.ipcRenderer.invoke('getToken');
            const userId = await window.electron.ipcRenderer.invoke('getId');

            const response = await axios.get(`${BASE_URL}games/getUserGameCount/${userId}`, {
                headers: {
                    Authorization: token,
                },
            });

            setUser((prevUser) => ({
                ...prevUser,
                gameCount: response.data,
            }));
        } catch (error) {
            console.error('Error fetching friend count:', error);
        }
    };

    const getFriendCount = async () => {
        try {
            const token = await window.electron.ipcRenderer.invoke('getToken');
            const userId = await window.electron.ipcRenderer.invoke('getId');

            const response = await axios.get(`${BASE_URL}users/getFriendCount/${userId}`, {
                headers: {
                    Authorization: token,
                },
            });

            setUser((prevUser) => ({
                ...prevUser,
                friendCount: response.data,
            }));
        } catch (error) {
            console.error('Error fetching friend count:', error);
        }
    };

    const getPostCount = async () => {
        try {
            const token = await window.electron.ipcRenderer.invoke('getToken');
            const userId = await window.electron.ipcRenderer.invoke('getId');

            const response = await axios.get(`${BASE_URL}users/getPostCount/${userId}`, {
                headers: {
                    Authorization: token,
                },
            });

            setUser((prevUser) => ({
                ...prevUser,
                postCount: response.data,
            }));
        } catch (error) {
            console.error('Error fetching post count:', error);
        }
    };

    const getFriends = async () => {
        if (loadingFriend) return;

        setLoadingFriend(true);

        const token = await window.electron.ipcRenderer.invoke('getToken');
        const userId = await window.electron.ipcRenderer.invoke('getId');

        try {
            const response = await axios.get(`${BASE_URL}users/getFriendsByUserId`, {
                params: { userId: userId, page: friendPage, size: 10 },
                headers: { 'Authorization': `${token}` },
            });

            const newFriends = response.data;
            setFriends(prevFriends => [...prevFriends, ...newFriends]);
            setFriendPage(prevPage => prevPage + 1);

            if (newFriends.length === 0) {
                setHasMoreFriends(false);
            }
        } catch (error) {
            console.log("Error fetching friends data:", error);
        } finally {
            setLoadingFriend(false);
        }
    }

    const loadMoreLikes = async () => {
        if (loadingLike || !hasMoreLikes) {
            return;
        }

        setLoadingLike(true);

        try {
            const token = await window.electron.ipcRenderer.invoke('getToken');
            const userId = await window.electron.ipcRenderer.invoke('getId');

            const response = await axios.get(`${BASE_URL}posts/getUserLikedPosts`, {
                params: {
                    userId: userId,
                    pageNumber: likePage,
                    pageSize: 10
                },
                headers: {
                    'Authorization': token
                }
            });

            if (response.data && Array.isArray(response.data.content)) {
                const newLikes = response.data.content;
                setLikes(prevLikes => [...prevLikes, ...newLikes]);
                setLikePage(prevPage => prevPage + 1);
                setHasMoreLikes(newLikes.length === 10);
            } else {
                setHasMoreLikes(false);
            }
        } catch (error) {
            console.error(error);
        } finally {
            setLoadingLike(false);
        }
    };

    const [editIsEmailEditable, setEditIsEmailEditable] = useState(true);
    const [editIsUsernameEditable, setEditIsUsernameEditable] = useState(true);

    const [editProfilePicturePreview, setEditProfilePicturePreview] = useState(null);

    const handleProfilePictureChange = (event) => {
        const file = event.target.files[0];
        setEditProfilePicture(file);
        setEditProfilePicturePreview(URL.createObjectURL(file));
    };

    const toggleEmailEditable = () => setEditIsEmailEditable(!editIsEmailEditable);
    const toggleUsernameEditable = () => setEditIsUsernameEditable(!editIsUsernameEditable);


    const [editEmail, setEditEmail] = useState("");
    const [editUsername, setEditUsername] = useState("");
    const [editDescription, setEditDescription] = useState("");
    const [editProfilePicture, setEditProfilePicture] = useState(null);
    const [editFirstName, setEditFirstName] = useState('');
    const [editLastName, setEditLastName] = useState('');
    const [editPhoneNumber, setEditPhoneNumber] = useState('');
    const [editBirthDate, setEditBirthDate] = useState('');

    const handleEmailChange = (event) => setEditEmail(event.target.value);
    const handleUsernameChange = (event) => setEditUsername(event.target.value);
    const handleDescriptionChange = (event) => setEditDescription(event.target.value);

    const [feedbackList, setFeedbackList] = useState({
        firstName: [editFirstName, false, "", 2],
        lastName: [editLastName, false, "", 2],
        email: [editEmail, false, "", 10],
        username: [editUsername, false, "", 3, 15],
        birthDate: [editBirthDate, false, "", 2],
        phoneNumber: [editPhoneNumber, false, "", 2]
    })

    useEffect(() => {
        if (user) {
            setEditEmail(user.email);
            setEditUsername(user.userName);
            setEditDescription(user.profileDescription);
            setEditProfilePicture(user.profilePhotoUrl);
            setEditFirstName(user.firstName);
            setEditLastName(user.lastName);
            setEditBirthDate(user.birthDate);
            setEditPhoneNumber(user.phoneNumber);

            const tempFeedbackList = {
                firstName: [user.firstName, false, "", 2],
                lastName: [user.lastName, false, "", 2],
                email: [user.email, false, "", 10],
                username: [user.userName, false, "", 3, 15],
                birthDate: [user.birthDate, false, "", 2],
                phoneNumber: [user.phoneNumber, false, "", 2]
            };
            setFeedbackList(tempFeedbackList);
        }
    }, [user]);


    useEffect(() => {
        if (user) {
            setEditEmail(user.email);
            setEditUsername(user.userName);
            setEditDescription(user.profileDescription !== null ? ("") : (user.profileDescription));
            setEditProfilePicture(user.profilePhotoUrl);
            setEditFirstName(user.firstName);
            setEditLastName(user.lastName);
            setEditBirthDate(user.birthDate);
            setEditPhoneNumber(user.phoneNumber);
            setEditProfilePicturePreview(user.profilePhotoUrl)
        }
    }, [user]);

    const handleSaveChanges = async () => {
        const formData = new FormData();
        formData.append('email', editEmail);
        formData.append('username', editUsername);
        formData.append('description', editDescription);
        formData.append('firstName', editFirstName);
        formData.append('lastName', editLastName);
        formData.append('phoneNumber', editPhoneNumber);
        formData.append('birthDate', editBirthDate);
        if (editProfilePicture) {
            formData.append('media', editProfilePicture);
        }

        const token = await window.electron.ipcRenderer.invoke('getToken');
        const userId = await window.electron.ipcRenderer.invoke('getId');

        console.log(editDescription)

        try {
            const response = await axios.put(`${BASE_URL}users/${userId}`, formData, {
                headers: {
                    'Content-Type': 'multipart/form-data',
                    'Authorization': token,
                },
            });
            if (response.status === 200) {
                handleSnackbar('Profile updated successfully!', 'success');
                setUpdate(true)
                handleEditProfileClose()

                await ipcRenderer.invoke('setCredentials', {
                    token: token,
                    userId: userId,
                    username: editUsername,
                });
                dispatch(setUserData({
                    profilePhotoUrl: response.data.profilePhotoUrl,
                    username: editUsername,
                }));
            } else {
                handleSnackbar('Error updating profile', 'error');
            }
        } catch (error) {
            handleSnackbar('Error updating profile', 'error');
            console.error('Error updating profile:', error);
        }
    };

    const handleCurrentPasswordChange = (e) => {
        setCurrentPassword(e.target.value);
    };

    const handleNewPasswordChange = (e) => {
        setNewPassword(e.target.value);
    };

    const handleConfirmPasswordChange = (e) => {
        setConfirmPassword(e.target.value);
    };

    const handlePrivacyToggle = () => {
        setIsPrivateAccount((prevValue) => !prevValue);
    };

    const handleAccountClose = () => {
        setOpenAccountSettings(false);
    };

    const loadMorePosts = async () => {
        if (loadingPosts) return;
        setLoadingPosts(true);

        try {
            const token = await window.electron.ipcRenderer.invoke('getToken');
            const userId = await window.electron.ipcRenderer.invoke('getId');

            const response = await axios.get(`${BASE_URL}posts/getUserPosts`, {
                params: {
                    userId: userId,
                    pageNumber: page,
                    pageSize: 10
                },
                headers: { 'Authorization': `${token}` },
            });

            if (response.data && Array.isArray(response.data.content)) {
                setPosts(prevPosts => [...prevPosts, ...response.data.content]);
                setPage(prevPage => prevPage + 1);
                setHasMore(response.data.content.length > 0);
            } else {
                setHasMore(false);
            }
        } catch (error) {
            console.error(error);
        } finally {
            setLoadingPosts(false);
        }
    };

    const handleAccountSettingsOpen = () => {
        setOpenAccountSettings(true);
    };

    const handleAccountSettingsClose = () => {
        setOpenAccountSettings(false);
    };

    const handleEditProfileOpen = () => {
        setOpenEditProfile(true);
    };

    const handleEditProfileClose = () => {
        setOpenEditProfile(false);
    };

    useEffect(() => {
        const resizeListener = (event, size) => setWindowSize(size);

        window.electron.ipcRenderer.on('window-resize', resizeListener);

        return () => {
            window.electron.ipcRenderer.removeListener('window-resize', resizeListener);
        };
    }, []);


    useEffect(() => {
        (async () => {
            try {
                const username = await window.electron.ipcRenderer.invoke('getUsername');
                setUsername(username);
            } catch (error) {
                console.log(error);
            }
        })();
    }, []);

    useEffect(() => {
        (async () => {
            const size = await window.electron.ipcRenderer.invoke('get-window-size');
            setWindowSize(size);
        })();
    }, []);

    const handleTabChange = (event, newValue) => {
        if (tab !== newValue) {
            setTab(newValue);
        }
    };

    const handleClose = (event?: React.SyntheticEvent | Event, reason?: string) => {
        if (reason === 'clickaway') {
            return;
        }

        setToastOpen(false);
    };

    const handlePostDelete = (postId) => {
        setPosts(posts.filter((post) => post.id !== postId));
    };

    function validation(e) {
        let tempFeedbackList = {
            phoneNumber: [phoneNumber, false, "Enter a phone number", 2],
        };
        setFeedbackList(tempFeedbackList);

        let count = 0;

        for (let key in tempFeedbackList) {
            if (
                tempFeedbackList[key][0] === "" &&
                e === "submit" ||
                (tempFeedbackList[key][0].length < tempFeedbackList[key][3] &&
                    e === "dynamic" &&
                    tempFeedbackList[key][0].length > 0)
            ) {
                tempFeedbackList[key][1] = true;
                setFeedbackList(tempFeedbackList);
                count++;
            } else if (key !== "emailInput") {
                tempFeedbackList[key][1] = false;
            }
        }

        return count === 0;
    }

    const handleAccountSave = async () => {
        try {
            const userId = await window.electron.ipcRenderer.invoke('getId');

            const params = new URLSearchParams();
            params.append('currentPassword', currentPassword);
            params.append('newPassword', newPassword);
            params.append('confirmPassword', confirmPassword);

            const token = await window.electron.ipcRenderer.invoke('getToken');

            const response = await axios.post(`${BASE_URL}users/changePassword/${userId}?${params.toString()}`, null, {
                headers: {
                    Authorization: `${token}`,
                },
            });

            handleSnackbar('Password updated successfully', 'success');
            handleAccountClose();
            setCurrentPassword("")
            setNewPassword("")
            setConfirmPassword("")
        } catch (error) {
            handleSnackbar('Failed to update password', 'error');
            console.error('Failed to update password:', error);
        }
    };

    const handleProfileClick = (username) => {
        navigate(`/profile/${username}`, { replace: true });
    };

    if (loadingUser) {
        return(<LoadingRow />)
    }

    const handleLike = (postId, newValue) => {
        setPosts(prevPosts => prevPosts.map(post => post.id === postId ? { ...post, likeCount: newValue } : post));
    };

    const getUserGames = async () => {
        setGamesLoading(true);
        try {
            const token = await window.electron.ipcRenderer.invoke('getToken');
            const userId = await window.electron.ipcRenderer.invoke('getId');

            const response = await axios.get(`${BASE_URL}games/getUserGames/${userId}`, {
                headers: { 'Authorization': `${token}` },
            });

            const newGames = response.data;

            setGames(newGames);
        } catch (e) {
            console.log(e);
        } finally {
            setGamesLoading(false);
        }
    };

    return(
        <>
            <Helmet>
                <title> {username} </title>
            </Helmet>

            <Snackbar open={snackbarOpen} autoHideDuration={3000} onClose={handleCloseSnackbar}>
                <Alert onClose={handleCloseSnackbar} severity={snackbarSeverity} sx={{ width: '100%' }}>
                    {snackbarMessage}
                </Alert>
            </Snackbar>

            <Dialog open={openEditProfile} onClose={handleEditProfileClose}>
                <DialogTitle>Edit Profile</DialogTitle>
                <DialogContent>
                    <Stack spacing={2} sx={{mt: 3}}>
                        {editIsEmailEditable && (
                            <TextField
                                label="Email"
                                defaultValue={editEmail}
                                fullWidth
                                onChange={event => setEditEmail(event.target.value)}
                            />
                        )}

                        {editIsUsernameEditable && (
                            <TextField
                                label="Username"
                                defaultValue={editUsername}
                                fullWidth
                                onChange={event => setEditUsername(event.target.value)}
                            />
                        )}

                        <TextField
                            label="First Name"
                            defaultValue={editFirstName}
                            fullWidth
                            onChange={event => setEditFirstName(event.target.value)}
                        />

                        <TextField
                            label="Last Name"
                            defaultValue={editLastName}
                            fullWidth
                            onChange={event => setEditLastName(event.target.value)}
                        />

                        <PhoneInput
                            country="tr"
                            inputStyle={{ borderRadius: '13px', height: '50px', width: '100%' }}
                            value={editPhoneNumber}
                            onChange={(value) => setEditPhoneNumber(value)}
                        />

                        <TextField
                            label="Birth Date"
                            value={editBirthDate}
                            fullWidth
                            type="date"
                            InputLabelProps={{ shrink: true }}
                            onChange={(event) => setEditBirthDate(event.target.value)}
                        />

                        <Box display="flex" alignItems="center">
                            <Avatar src={editProfilePicturePreview} alt="Profile Picture" sx={{ width: 80, height: 80, mr: 2 }} />
                            <Box>
                                <input type="file" accept="image/*" onChange={handleProfilePictureChange} />
                            </Box>
                        </Box>

                        <TextField
                            label="Description"
                            value={editDescription}
                            fullWidth
                            onChange={event => setEditDescription(event.target.value)}
                        />
                    </Stack>
                </DialogContent>
                <DialogActions>
                    <Button onClick={handleEditProfileClose}>Cancel</Button>
                    <Button onClick={handleSaveChanges}>Save Changes</Button>
                </DialogActions>
            </Dialog>

            <Dialog open={openAccountSettings} onClose={handleAccountClose}>
                <DialogTitle>Account Settings</DialogTitle>
                <DialogContent>
                    <TextField
                        type="password"
                        label="Current Password"
                        value={currentPassword}
                        onChange={handleCurrentPasswordChange}
                        fullWidth
                        margin="normal"
                    />
                    <TextField
                        type="password"
                        label="New Password"
                        value={newPassword}
                        onChange={handleNewPasswordChange}
                        fullWidth
                        margin="normal"
                    />
                    <TextField
                        type="password"
                        label="Confirm Password"
                        value={confirmPassword}
                        onChange={handleConfirmPasswordChange}
                        fullWidth
                        margin="normal"
                    />
                    {/*<FormGroup>*/}
                    {/*    <FormControlLabel*/}
                    {/*        control={*/}
                    {/*            <Switch checked={isPrivateAccount} onChange={handlePrivacyToggle} color="primary" />*/}
                    {/*        }*/}
                    {/*        label="Private Account"*/}
                    {/*    />*/}
                    {/*</FormGroup>*/}
                </DialogContent>
                <DialogActions>
                    <Button onClick={handleAccountClose}>Cancel</Button>
                    <Button onClick={handleAccountSave} color="primary">
                        Save Changes
                    </Button>
                </DialogActions>
            </Dialog>

            <Snackbar open={toastOpen} autoHideDuration={3000} onClose={handleClose}>
                <Alert onClose={handleClose} severity="success" sx={{ width: '100%' }}>
                    This is a success message!
                </Alert>
            </Snackbar>

            <Grid container columns={16} sx={{px: 7, pt: 2}}>
                    <Grid xs={16}>
                        <Card sx={{height: cardHeight}}>
                            <CardContent>
                                <Stack direction="row" spacing={8}>
                                    <Grid>
                                        <Avatar src={user.profilePhotoUrl} alt="photoURL" sx={{ minWidth: avatarSize, minHeight: avatarSize }}/>
                                    </Grid>

                                    <Grid direction="column" sx={{paddingY: 6}} xs={6}>
                                        <Typography variant="subtitle1" gutterBottom>{user.firstName} {' '} {user.lastName}</Typography>

                                        <Typography variant="h3" sx={{fontWeight: "bold", fontSize: usernameFontSize}} gutterBottom>
                                            {username}
                                        </Typography>

                                        <Typography flexWrap variant="h7" gutterBottom sx={{pt: 0.5}}>
                                            {user.profileDescription === null ? ("") : (user.profileDescription)}
                                        </Typography>
                                    </Grid>

                                    <Grid container direction="column" sx={{pl: 7, py: 6}}>
                                        <Grid item sx={{mt: 1}}>
                                            <Stack direction={"row"}>
                                                <Typography fontWeight={"bold"} fontSize={22}>
                                                    {user.friendCount}
                                                </Typography>

                                                <Typography>
                                                    &nbsp;
                                                </Typography>

                                                <Typography>
                                                    friends
                                                </Typography>
                                            </Stack>
                                        </Grid>

                                        <Box sx={{ flexGrow: 0.2 }} />

                                        <Grid item sx={{mt: 1}}>
                                            <Stack direction={"row"}>
                                                <Typography fontWeight={"bold"} fontSize={22}>
                                                    {user.postCount}
                                                </Typography>

                                                <Typography>
                                                    &nbsp;
                                                </Typography>

                                                <Typography>
                                                    posts
                                                </Typography>
                                            </Stack>
                                        </Grid>

                                        <Box sx={{ flexGrow: 0.2 }} />

                                        <Grid item sx={{mt: 1}}>
                                            <Stack direction={"row"}>
                                                <Typography fontWeight={"bold"} fontSize={22}>
                                                    {user.gameCount}
                                                </Typography>

                                                <Typography>
                                                    &nbsp;
                                                </Typography>

                                                <Typography>
                                                    games
                                                </Typography>
                                            </Stack>
                                        </Grid>
                                    </Grid>

                                    <Grid item xs={3} alignItems="center" justifyContent="center" sx={{py: 6}}>
                                        <Button variant="contained" color="primary" sx={{height: 50, mb: 2, mt: 2}}
                                                onClick={handleEditProfileOpen}>
                                            Edit profile
                                        </Button>

                                        <Box sx={{ flexGrow: 1 }} />

                                        <Button variant="contained" color="primary" onClick={handleAccountSettingsOpen} sx={{height: 50}}>
                                            Account settings
                                        </Button>
                                    </Grid>
                                </Stack>
                            </CardContent>
                        </Card>
                    </Grid>

                </Grid>

                <Grid container columns={16} sx={{px: 7}}>
                    <Grid xs={16}>
                        <Card sx={{mt: 1}}>
                            <Box sx={{ width: '100%' }}>
                                <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
                                    <Tabs value={tab} onChange={handleTabChange} aria-label="basic tabs" centered>
                                        <Tab label="Posts" {...a11yProps(0)} />
                                        <Box sx={{ flexGrow: 0.1 }} />
                                        <Tab label="Games" {...a11yProps(1)} />
                                        <Box sx={{ flexGrow: 0.1 }} />
                                        <Tab label="Likes" {...a11yProps(2)} />
                                        <Box sx={{ flexGrow: 0.1 }} />
                                        <Tab label="Friends" {...a11yProps(3)} />
                                    </Tabs>
                                </Box>
                                <TabPanel value={tab} index={0}>
                                    <Grid container columns={16} justifyContent="center">
                                        <Grid item xs={16} md={13}>
                                            <InfiniteScroll
                                                dataLength={posts.length}
                                                next={loadMorePosts}
                                                hasMore={hasMore}
                                                loader={<LoadingRow />}
                                                endMessage={
                                                    <p style={{ textAlign: 'center' }}>
                                                        <b>Yay! You have seen it all</b>
                                                    </p>
                                                }
                                            >
                                                {posts.length > 0 ? (
                                                    posts.map((post) => (
                                                    <PostCardLeft
                                                        key={post.id}
                                                        post={post}
                                                        onDelete={handlePostDelete}
                                                        isLiked={post.likedByUser}
                                                        commentCount={post.commentCount}
                                                        likeCount={post.likeCount}
                                                        handleLike={handleLike}
                                                    />
                                                    ))
                                                ) : (
                                                    <p style={{ textAlign: 'center', marginTop: '1rem' }}>
                                                        Looks like there are no posts yet. Stay tuned!
                                                    </p>
                                                )}
                                            </InfiniteScroll>
                                        </Grid>
                                    </Grid>
                                </TabPanel>
                                <TabPanel value={tab-1} index={1}>
                                    <Grid container justifyContent="center">
                                        {games.length === 0 ?
                                            gamesLoading ?
                                                (
                                                    <Grid>
                                                        <LoadingRow />
                                                        <Typography>
                                                            Loading your games, please wait!
                                                        </Typography>
                                                    </Grid>
                                                )
                                                :
                                                (
                                                    <Typography>
                                                        Unfortunately, we couldn't retrieve your games :(
                                                    </Typography>
                                                )
                                            :
                                            games.map((game) => (
                                                <Grid item key={game.id} xs={12} sm={6} md={4}>
                                                    <Box sx={{ px: { xs: 0, sm: 0, md: -1 } }}>
                                                        <GameCard game={game} />
                                                    </Box>
                                                </Grid>
                                            ))
                                        }
                                    </Grid>

                                </TabPanel>
                                <TabPanel value={tab - 2} index={2}>
                                    <Grid container columns={16} justifyContent="center">
                                        <Grid item xs={16} md={13}>
                                            <InfiniteScroll
                                                dataLength={likes.length}
                                                next={loadMoreLikes}
                                                hasMore={hasMoreLikes}
                                                loader={<LoadingRow />}
                                                endMessage={
                                                    <p style={{ textAlign: 'center' }}>
                                                        <b>Yay! You have seen it all</b>
                                                    </p>
                                                }
                                            >
                                                {likes.length > 0 ? (
                                                    likes.map((post) => (
                                                        <PostCardLeft
                                                            key={post.id}
                                                            post={post}
                                                            onDelete={handlePostDelete}
                                                            isLiked={post.likedByUser}
                                                            commentCount={post.commentCount}
                                                            likeCount={post.likeCount}
                                                            handleLike={handleLike}
                                                        />
                                                    ))
                                                ) : (
                                                    <p style={{ textAlign: 'center', marginTop: '1rem' }}>
                                                        Looks like there are no liked posts yet. Stay tuned!
                                                    </p>
                                                )}
                                            </InfiniteScroll>
                                        </Grid>
                                    </Grid>
                                </TabPanel>
                                <TabPanel value={tab-3} index={3}>
                                        <InfiniteScroll
                                            dataLength={friends.length}
                                            next={getFriends}
                                            hasMore={hasMoreFriends}
                                            loader={<h4><LoadingRow /></h4>}
                                            endMessage={
                                                <p style={{ textAlign: 'center' }}>
                                                    <b>Yay! Small circle ;)</b>
                                                </p>
                                            }
                                        >
                                            <Grid container spacing={2}>
                                            {friends.map((friend) => (
                                                <Grid key={friend.id} item xs={12} sm={6}>
                                                    <ProfileCardSm
                                                        onSuccess={(e) => {
                                                            if (e === "add") {
                                                                handleSnackbar('Friend request sent!', 'success');
                                                            } else {
                                                                handleSnackbar('Friend removed', 'success');
                                                            }
                                                        }}
                                                        username={friend.username} profilePhotoUrl={friend.profilePhotoUrl} isFriend={friend.isFriend}/>
                                                </Grid>
                                            ))}
                                            </Grid>
                                        </InfiniteScroll>
                                </TabPanel>
                            </Box>
                        </Card>
                    </Grid>
                </Grid>
        </>
    );
}