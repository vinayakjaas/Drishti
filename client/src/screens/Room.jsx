import React, { useEffect, useCallback, useState } from "react";
import ReactPlayer from "react-player";
import peer from "../service/peer";
import { useSocket } from "../context/SocketProvider";
import "bootstrap/dist/css/bootstrap.min.css";
import "../custom1.css"; // Import custom CSS for greenish vampire effect

const RoomPage = () => {
  const socket = useSocket();
  const [remoteSocketId, setRemoteSocketId] = useState(null);
  const [myStream, setMyStream] = useState();
  const [connectedUsers, setConnectedUsers] = useState([]);

  const handleUserJoined = useCallback(({ email, id }) => {
    console.log(`Email ${email} joined room`);
    setConnectedUsers((prevUsers) => [
      ...prevUsers,
      { id, email, stream: null },
    ]);
  }, []);

  const handleUserLeft = useCallback(({ id }) => {
    console.log(`User ${id} left room`);
    setConnectedUsers((prevUsers) =>
      prevUsers.filter((user) => user.id !== id)
    );
  }, []);

  const handleCallUser = useCallback(
    async (userId) => {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: true,
      });
      const offer = await peer.getOffer();
      socket.emit("user:call", { to: userId, offer });
      setMyStream(stream);
    },
    [socket]
  );

  const handleIncommingCall = useCallback(
    async ({ from, offer }) => {
      setRemoteSocketId(from);
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: true,
      });
      setMyStream(stream);
      console.log(`Incoming Call`, from, offer);
      const ans = await peer.getAnswer(offer);
      socket.emit("call:accepted", { to: from, ans });
    },
    [socket]
  );

  const sendStreams = useCallback(() => {
    for (const track of myStream.getTracks()) {
      peer.peer.addTrack(track, myStream);
    }
  }, [myStream]);

  const handleCallAccepted = useCallback(
    ({ from, ans }) => {
      peer.setLocalDescription(ans);
      console.log("Call Accepted!");
      sendStreams();
    },
    [sendStreams]
  );

  const handleNegoNeeded = useCallback(async () => {
    const offer = await peer.getOffer();
    socket.emit("peer:nego:needed", { offer, to: remoteSocketId });
  }, [remoteSocketId, socket]);

  useEffect(() => {
    peer.peer.addEventListener("negotiationneeded", handleNegoNeeded);
    return () => {
      peer.peer.removeEventListener("negotiationneeded", handleNegoNeeded);
    };
  }, [handleNegoNeeded]);

  const handleNegoNeedIncomming = useCallback(
    async ({ from, offer }) => {
      const ans = await peer.getAnswer(offer);
      socket.emit("peer:nego:done", { to: from, ans });
    },
    [socket]
  );

  const handleNegoNeedFinal = useCallback(async ({ ans }) => {
    await peer.setLocalDescription(ans);
  }, []);

  useEffect(() => {
    peer.peer.addEventListener("track", async (ev) => {
      const remoteStream = ev.streams[0];
      console.log("GOT TRACKS!!");
      setConnectedUsers((prevUsers) =>
        prevUsers.map((user) =>
          user.id === remoteSocketId ? { ...user, stream: remoteStream } : user
        )
      );
    });
  }, [remoteSocketId]);

  useEffect(() => {
    socket.on("user:joined", handleUserJoined);
    socket.on("user:left", handleUserLeft);
    socket.on("incomming:call", handleIncommingCall);
    socket.on("call:accepted", handleCallAccepted);
    socket.on("peer:nego:needed", handleNegoNeedIncomming);
    socket.on("peer:nego:final", handleNegoNeedFinal);

    return () => {
      socket.off("user:joined", handleUserJoined);
      socket.off("user:left", handleUserLeft);
      socket.off("incomming:call", handleIncommingCall);
      socket.off("call:accepted", handleCallAccepted);
      socket.off("peer:nego:needed", handleNegoNeedIncomming);
      socket.off("peer:nego:final", handleNegoNeedFinal);
    };
  }, [
    socket,
    handleUserJoined,
    handleUserLeft,
    handleIncommingCall,
    handleCallAccepted,
    handleNegoNeedIncomming,
    handleNegoNeedFinal,
  ]);

  return (
    <div className="container d-flex justify-content-center align-items-center min-vh-100 text-light">
      <div className="card bg-dark text-light p-5">
        <h1 className="text-center mb-4">Room Page</h1>
        <h4 className="text-center mb-4">
          {connectedUsers.length > 0
            ? `${connectedUsers.length} people in room`
            : "No one in room"}
        </h4>
        {myStream && (
          <button className="btn btn-success w-100 mb-3" onClick={sendStreams}>
            Send Stream
          </button>
        )}
        {connectedUsers.map((user) => (
          <div key={user.id} className="mb-4">
            <h5 className="text-center">{user.email}</h5>
            {user.stream ? (
              <ReactPlayer
                playing
                muted
                height="200px"
                width="100%"
                url={user.stream}
              />
            ) : (
              <button
                className="btn btn-primary w-100 mb-3"
                onClick={() => handleCallUser(user.id)}
              >
                Call {user.email}
              </button>
            )}
          </div>
        ))}
        {myStream && (
          <div className="mb-4">
            <h5 className="text-center">My Stream</h5>
            <ReactPlayer
              playing
              muted
              height="200px"
              width="100%"
              url={myStream}
            />
          </div>
        )}
      </div>
    </div>
  );
};

export default RoomPage;
