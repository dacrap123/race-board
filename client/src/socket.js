import { io } from 'socket.io-client';

// autoConnect: false so we connect explicitly after choosing a session
const socket = io({ autoConnect: false });

export default socket;
