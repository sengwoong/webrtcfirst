import './App.css';
import { useRef, useEffect } from 'react';
import io from 'socket.io-client';

const socket = io('https://b6ea-220-68-8-39.ngrok-free.app/remote-ctrl');

function App() {
  const videoRef = useRef();
  const rtcPeerConnection = useRef(
    new RTCPeerConnection({
      iceServers: [
        { urls: "stun:stun.l.google.com:19302" },
        { urls: "stun:stun1.l.google.com:19302" },
        { urls: "stun:stun2.l.google.com:19302" }
      ]
    })
  );

  const handleStream = (stream) => {
    console.log(stream,"stream")
    console.log("연결까지감")
     stream.getTracks().forEach((track) => {
      rtcPeerConnection.current.addTrack(track, stream);
    });
    videoRef.current.srcObject = stream;
    videoRef.current.onloadedmetadata = () => videoRef.current.play();
    //   .getVideoTracks()[0], stream);
    // videoRef.current.onloadedmetadata = (e) => videoRef.current.play();
// console.log(videoRef.current.play())
    console.log("연결까지감됌")
    
  };
  

  const getStream = async (selectedScreen) => {
    console.log("getStream")
    try {
      console.log(selectedScreen);
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: false,
        video: {
          mandatory: {
            chromeMediaSource: 'desktop',
            chromeMediaSourceId: selectedScreen.id,
          },
        },
      });
console.log(stream,"stream")
      handleStream(stream);
    } catch (e) {
      console.log('Error accessing media devices:', e);
    }
  };

  useEffect(() => {
    (window.electronAPI &&
      window.electronAPI.getScreenId((event, screenId) => {
        console.log('Renderer...', screenId);
        console.log('Renderer...', screenId);

        getStream(screenId);
      })) ||
      getStream({ video: true, audio: false });

    socket.on('offer', (offerSDP) => {
      console.log('Received offer');
      rtcPeerConnection.current
        .setRemoteDescription(new RTCSessionDescription(offerSDP))
        .then(() => {
          rtcPeerConnection.current.createAnswer().then((sdp) => {
            rtcPeerConnection.current.setLocalDescription(sdp);

            console.log('Sending answer');
            socket.emit('answer', sdp);
          });
        });
    });

    socket.on('answer', (answerSDP) => {
      console.log('Received answer');
      rtcPeerConnection.current.setRemoteDescription(
        new RTCSessionDescription(answerSDP)
      );
    });

    socket.on('icecandidate', (icecandidate) => {
      rtcPeerConnection.current.addIceCandidate(
        new RTCIceCandidate(icecandidate)
      );
    });

    rtcPeerConnection.current.onicecandidate = (e) => {
      if (e.candidate) {
        socket.emit('icecandidate', e.candidate);
        console.log('Sent icecandidate');
      }
    };

    rtcPeerConnection.current.oniceconnectionstatechange = (e) => {
      console.log('ICE connection state change:', e);
    };

    rtcPeerConnection.current.ontrack = (e) => {
      videoRef.current.srcObject = e.streams[0];
      videoRef.current.onloadedmetadata = (e) => videoRef.current.play();
      console.log('Received track:', e.streams[0]);
    };
  }, []);

  return (
    <div className="App">
      <div
        style={{
          display: 'block',
          backgroundColor: 'black',
          margin: 0,
        }}
      >
           <button onClick={getStream}>Get Media Stream</button>
        <video ref={videoRef} className="video">
          video not available
        </video>
      </div>
    </div>
  );
}

export default App;
