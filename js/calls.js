const Calls = {
  _localStream: null,
  _remoteStream: null,
  _peerConnection: null,
  _isCallActive: false,
  _isVideo: false,
  _isMuted: false,
  _isVideoOff: false,
  _callStartTime: null,
  _durationTimer: null,
  _onIncomingCall: null,
  _onCallEnd: null,
  _currentCallWith: null,
  _cleaningUp: false,
  _pendingOffer: null,
  _callTimeout: null,

  config: {
    iceServers: [
      { urls: 'stun:stun.l.google.com:19302' },
      { urls: 'stun:stun1.l.google.com:19302' },
      { urls: 'stun:stun2.l.google.com:19302' },
      { urls: 'stun:stun3.l.google.com:19302' },
      { urls: 'stun:stun4.l.google.com:19302' },
    ]
  },

  init(onIncomingCall, onCallEnd) {
    this._onIncomingCall = onIncomingCall;
    this._onCallEnd = onCallEnd;
  },

  handleSignal(data) {
    if (!data) return;
    switch (data.type) {
      case 'call-offer':
        if (!this._isCallActive) {
          this._currentCallWith = data.from;
          this._pendingOffer = data;
          this._onIncomingCall && this._onIncomingCall(data.from, data.fromName, data.isVideo);
        }
        break;
      case 'call-answer':
        this._handleAnswer(data.sdp);
        break;
      case 'call-ice-candidate':
        this._handleIceCandidate(data.candidate);
        break;
      case 'call-end':
        this._handleRemoteEnd();
        break;
      case 'call-decline':
        this._handleDecline();
        break;
      case 'call-accept':
        break;
    }
  },

  async startCall(toLogin, toName, isVideo = false) {
    this._cleaningUp = false;
    this._isVideo = isVideo;
    this._currentCallWith = toLogin;
    this._pendingOffer = null;

    try {
      this._localStream = await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: isVideo
      });
    } catch (err) {
      console.error('getUserMedia error:', err);
      return { success: false, error: 'Не удалось получить доступ к микрофону/камере. Проверьте разрешения.' };
    }

    try {
      this._createPeerConnection();
      for (const track of this._localStream.getTracks()) {
        this._peerConnection.addTrack(track, this._localStream);
      }

      const offer = await this._peerConnection.createOffer({
        offerToReceiveAudio: true,
        offerToReceiveVideo: isVideo
      });
      await this._peerConnection.setLocalDescription(offer);

      DB.send({
        type: 'call-offer',
        from: Auth.getCurrentUser().login,
        fromName: Auth.getCurrentUser().name,
        to: toLogin,
        isVideo,
        sdp: offer
      });

      this._isCallActive = true;
      this._startDuration();

      // Timeout for unanswered call
      this._callTimeout = setTimeout(() => {
        if (this._isCallActive && !this._remoteStream) {
          this.endCall();
          this._showError('Пользователь не ответил');
        }
      }, 30000);

      return { success: true };
    } catch (err) {
      console.error('Offer creation error:', err);
      this._cleanup();
      return { success: false, error: 'Ошибка создания звонка: ' + err.message };
    }
  },

  async acceptCall(isVideo = false) {
    if (!this._pendingOffer) return { success: false, error: 'Нет входящего звонка' };

    this._cleaningUp = false;
    this._isVideo = isVideo;

    clearTimeout(this._callTimeout);

    try {
      this._localStream = await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: isVideo
      });
    } catch (err) {
      console.error('getUserMedia error:', err);
      return { success: false, error: 'Не удалось получить доступ к микрофону/камере' };
    }

    try {
      this._createPeerConnection();
      for (const track of this._localStream.getTracks()) {
        this._peerConnection.addTrack(track, this._localStream);
      }

      if (this._pendingOffer.sdp) {
        await this._peerConnection.setRemoteDescription(new RTCSessionDescription(this._pendingOffer.sdp));
      }

      const answer = await this._peerConnection.createAnswer();
      await this._peerConnection.setLocalDescription(answer);

      DB.send({
        type: 'call-answer',
        from: Auth.getCurrentUser().login,
        to: this._pendingOffer.from,
        sdp: answer
      });

      DB.send({
        type: 'call-accept',
        from: Auth.getCurrentUser().login,
        to: this._currentCallWith
      });

      this._pendingOffer = null;
      this._isCallActive = true;
      this._startDuration();
      return { success: true };
    } catch (err) {
      console.error('Accept call error:', err);
      this._cleanup();
      return { success: false, error: 'Ошибка подключения: ' + err.message };
    }
  },

  declineCall() {
    DB.send({
      type: 'call-decline',
      from: Auth.getCurrentUser().login,
      to: this._currentCallWith
    });
    this._pendingOffer = null;
    this._currentCallWith = null;
  },

  endCall() {
    if (this._cleaningUp) return;
    this._cleaningUp = true;

    clearTimeout(this._callTimeout);

    DB.send({
      type: 'call-end',
      from: Auth.getCurrentUser().login,
      to: this._currentCallWith
    });
    this._cleanup();
    this._onCallEnd && this._onCallEnd('ended');
  },

  _handleRemoteEnd() {
    this._cleanup();
    this._onCallEnd && this._onCallEnd('ended');
  },

  _handleDecline() {
    clearTimeout(this._callTimeout);
    this._cleanup();
    this._onCallEnd && this._onCallEnd('declined');
  },

  toggleMute() {
    if (this._localStream) {
      this._isMuted = !this._isMuted;
      this._localStream.getAudioTracks().forEach(t => t.enabled = !this._isMuted);
    }
    return this._isMuted;
  },

  toggleVideo() {
    if (this._localStream) {
      this._isVideoOff = !this._isVideoOff;
      this._localStream.getVideoTracks().forEach(t => t.enabled = !this._isVideoOff);
    }
    return this._isVideoOff;
  },

  getLocalStream() { return this._localStream; },
  getRemoteStream() { return this._remoteStream; },
  isCallActive() { return this._isCallActive; },
  isVideoCall() { return this._isVideo; },

  getCallDuration() {
    if (!this._callStartTime) return '00:00';
    const sec = Math.floor((Date.now() - this._callStartTime) / 1000);
    const m = String(Math.floor(sec / 60)).padStart(2, '0');
    const s = String(sec % 60).padStart(2, '0');
    return m + ':' + s;
  },

  _showError(msg) {
    const el = document.getElementById('call-error');
    if (el) { el.textContent = msg; el.classList.remove('hidden'); }
    const st = document.getElementById('call-status');
    if (st) st.textContent = 'Ошибка';
  },

  _createPeerConnection() {
    this._peerConnection = new RTCPeerConnection(this.config);
    this._remoteStream = new MediaStream();

    this._peerConnection.ontrack = (event) => {
      event.streams[0].getTracks().forEach(track => {
        this._remoteStream.addTrack(track);
      });
      const remoteVideo = document.getElementById('remote-video');
      if (remoteVideo) remoteVideo.srcObject = this._remoteStream;
    };

    this._peerConnection.onicecandidate = (event) => {
      if (event.candidate) {
        DB.send({
          type: 'call-ice-candidate',
          from: Auth.getCurrentUser().login,
          to: this._currentCallWith,
          candidate: event.candidate
        });
      }
    };

    this._peerConnection.oniceconnectionstatechange = () => {
      const state = this._peerConnection.iceConnectionState;
      if (state === 'connected' || state === 'completed') {
        const st = document.getElementById('call-status');
        if (st) st.textContent = 'В разговоре';
        const err = document.getElementById('call-error');
        if (err) err.classList.add('hidden');
      }
      if (state === 'disconnected' || state === 'failed' || state === 'closed') {
        if (this._isCallActive) this.endCall();
      }
    };

    this._peerConnection.onsignalingstatechange = () => {
      if (this._peerConnection.signalingState === 'closed') {
        if (this._isCallActive) this.endCall();
      }
    };
  },

  async _handleAnswer(sdp) {
    if (this._peerConnection && sdp) {
      try {
        await this._peerConnection.setRemoteDescription(new RTCSessionDescription(sdp));
        clearTimeout(this._callTimeout);
      } catch (e) {
        console.error('Set remote description error:', e);
      }
    }
  },

  async _handleIceCandidate(candidate) {
    if (this._peerConnection && candidate) {
      try {
        await this._peerConnection.addIceCandidate(new RTCIceCandidate(candidate));
      } catch (e) {
        // ignore - race conditions are normal
      }
    }
  },

  _startDuration() {
    this._callStartTime = Date.now();
    clearInterval(this._durationTimer);
    this._durationTimer = setInterval(() => {
      const durEl = document.getElementById('call-duration');
      if (durEl) durEl.textContent = this.getCallDuration();
    }, 1000);
  },

  _cleanup() {
    if (this._localStream) {
      this._localStream.getTracks().forEach(t => t.stop());
    }
    if (this._peerConnection) {
      this._peerConnection.close();
    }
    this._localStream = null;
    this._remoteStream = null;
    this._peerConnection = null;
    this._isCallActive = false;
    this._callStartTime = null;
    this._currentCallWith = null;
    this._isMuted = false;
    this._isVideoOff = false;
    this._cleaningUp = false;
    this._pendingOffer = null;
    clearInterval(this._durationTimer);
    clearTimeout(this._callTimeout);

    const remoteVideo = document.getElementById('remote-video');
    if (remoteVideo) remoteVideo.srcObject = null;
    const localVideo = document.getElementById('local-video');
    if (localVideo) localVideo.srcObject = null;
    const callError = document.getElementById('call-error');
    if (callError) callError.classList.add('hidden');
  }
};
