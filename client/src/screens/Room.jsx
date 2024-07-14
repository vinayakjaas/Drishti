import React, { useEffect, useCallback, useState } from "react";
import { useLocation } from "react-router-dom";
import ReactPlayer from "react-player";
import peer from "../service/peer";
import { useSocket } from "../context/SocketProvider";
import "bootstrap/dist/css/bootstrap.min.css";
import "../custom.css"; // Import custom CSS for greenish vampire effect

const RoomPage = () => {
  const location = useLocation();
  const { email, username } = location.state || {};
  const socket = useSocket();
  const [remoteSocketId, setRemoteSocketId] = useState(null);
  const [myStream, setMyStream] = useState();
  const [remoteStream, setRemoteStream] = useState();

  const handleUserJoined = useCallback(({ email, id }) => {
    console.log(`Email ${email} joined room`);
    setRemoteSocketId(id);
  }, []);

  const handleCallUser = useCallback(async () => {
    const stream = await navigator.mediaDevices.getUserMedia({
      audio: true,
      video: true,
    });
    const offer = await peer.getOffer();
    socket.emit("user:call", { to: remoteSocketId, offer });
    setMyStream(stream);
  }, [remoteSocketId, socket]);

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
      const remoteStream = ev.streams;
      console.log("GOT TRACKS!!");
      setRemoteStream(remoteStream[0]);
    });
  }, []);

  useEffect(() => {
    socket.on("user:joined", handleUserJoined);
    socket.on("incomming:call", handleIncommingCall);
    socket.on("call:accepted", handleCallAccepted);
    socket.on("peer:nego:needed", handleNegoNeedIncomming);
    socket.on("peer:nego:final", handleNegoNeedFinal);

    return () => {
      socket.off("user:joined", handleUserJoined);
      socket.off("incomming:call", handleIncommingCall);
      socket.off("call:accepted", handleCallAccepted);
      socket.off("peer:nego:needed", handleNegoNeedIncomming);
      socket.off("peer:nego:final", handleNegoNeedFinal);
    };
  }, [
    socket,
    handleUserJoined,
    handleIncommingCall,
    handleCallAccepted,
    handleNegoNeedIncomming,
    handleNegoNeedFinal,
  ]);

  return (
    <div className="container d-flex justify-content-center align-items-center min-vh-100 text-light">
      <div className="card bg-dark text-light p-5 w-100">
        <h1 className="text-center mb-4">Room Page</h1>
        <h4 className="text-center mb-4">
          {remoteSocketId ? "Connected" : "No one in room"}
        </h4>
        <div className="d-flex justify-content-center">
          {myStream && (
            <button className="btn btn-success mx-2" onClick={sendStreams}>
              Send Stream
            </button>
          )}
          {remoteSocketId && (
            <button className="btn btn-danger mx-2" onClick={handleCallUser}>
              CALL
            </button>
          )}
        </div>
        <div className="row mt-4">
          {myStream && (
            <div className="col-md-6 mb-4">
              <h5 className="text-center">My Stream</h5>
              <ReactPlayer
                playing
                muted
                height="200px"
                width="100%"
                url={myStream}
              />
              <div className="text-center mt-2">
                <span>{username}</span>
              </div>
            </div>
          )}
          {remoteStream && (
            <div className="col-md-6 mb-4">
              <h5 className="text-center">Remote Stream</h5>
              <ReactPlayer
                playing
                muted
                height="200px"
                width="100%"
                url={remoteStream}
              />
              <div className="text-center mt-2">
                <span>{username}</span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default RoomPage;
