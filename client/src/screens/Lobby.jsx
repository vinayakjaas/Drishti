import React, { useState, useCallback, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useSocket } from "../context/SocketProvider";
import "bootstrap/dist/css/bootstrap.min.css";
import "../custom.css"; // Import custom CSS for night mode

const LobbyScreen = () => {
  const [email, setEmail] = useState("");
  const [room, setRoom] = useState("");

  const socket = useSocket();
  const navigate = useNavigate();

  const handleSubmitForm = useCallback(
    (e) => {
      e.preventDefault();
      socket.emit("room:join", { email, room });
    },
    [email, room, socket]
  );

  const handleJoinRoom = useCallback(
    (data) => {
      const { email, room } = data;
      navigate(`/room/${room}`);
    },
    [navigate]
  );

  useEffect(() => {
    socket.on("room:join", handleJoinRoom);
    return () => {
      socket.off("room:join", handleJoinRoom);
    };
  }, [socket, handleJoinRoom]);

  return (
    <div className="container d-flex justify-content-center align-items-center min-vh-100">
      <div className="card bg-dark text-light p-5">
        <h1 className="text-center mb-4">Lobby</h1>
        <form onSubmit={handleSubmitForm}>
          <div className="form-group mb-3">
            <label htmlFor="email" className="form-label">
              Email ID
            </label>
            <input
              type="email"
              id="email"
              className="form-control"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <div className="form-group mb-4">
            <label htmlFor="room" className="form-label">
              Room Number
            </label>
            <input
              type="text"
              id="room"
              className="form-control"
              value={room}
              onChange={(e) => setRoom(e.target.value)}
            />
          </div>
          <button type="submit" className="btn btn-primary w-100">
            Join
          </button>
        </form>
      </div>
    </div>
  );
};

export default LobbyScreen;
