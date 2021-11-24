import axios from "axios";

class HttpConnectionJsonRpc {
  #protocol
  #host
  #port
  #path
  #agent
  #user
  #pass
  #isOpen = true

  constructor({ protocol, host, port, username, password }) {
    this.#path = '/jsonrpc';
    this.#host = host; // TODO: Validate host pattern and assign default if needed
    this.#port = port; // TODO: Validate port pattern and assign default if needed
    this.#protocol = ['http', 'https'].includes(protocol.toLowerCase()) ? protocol : 'http';
    this.#user = username;
    this.#pass = password;

    this.#agent = axios.create({ withCredentials: true });

    this.#agent.interceptors.request.use(config => {
      // Add Auth header for all http requests if we have login info
      if (this.#user || this.#pass) {
        config.headers.Authorization = `Basic ${window.btoa(`${this.#user}:${this.#pass}`)}`;
        config.headers['Content-Type'] = 'application/json';
        // config.headers['Origin'] = this.endpoint;
      }
      return config;
    })

  }

  get endpoint() {
    return `${this.#protocol}://${this.#host}:${this.#port}${this.#path}`.toLocaleLowerCase();
  }

  get isOpen() {
    return this.#isOpen;
  }

  sendMessage = (message, urlParams = '') => {
    return this.#agent.post(this.endpoint + urlParams, message, { withCredentials: true, headers: { Authorization: `Basic ${window.btoa(`${this.#user}:${this.#pass}`)}` } })
      .then(res => res.data);
  }

  close = () => {
    this.#isOpen = false;
  }

  open = () => {
    this.#isOpen = true;
    return true;
  }
}

class SocketConnectionJsonRpc {
  #protocol
  #host
  #port
  #path
  #agent
  #user
  #pass
  #isOpen
  #requestQueue = new Map();
  #nextId = 1;
  #currentRequest = null;

  constructor({ protocol, host, port, username, password }) {
    this.#path = '/jsonrpc';
    this.#host = host; // TODO: Validate host pattern and assign default if needed
    this.#port = port; // TODO: Validate port pattern and assign default if needed
    this.#protocol = 'ws';
    this._initSocket();

    this.handleDisconnect = this.handleDisconnect.bind(this);
  }

  get endpoint() {
    return `${this.#protocol}://${this.#host}:${this.#port}${this.#path}`.toLocaleLowerCase();
  }

  get isOpen() {
    return this.#isOpen;
  }

  get nextId() {
    this.#nextId += 1;
    return this.#nextId;
  }

  _initSocket() {
    this.#agent = new window.WebSocket(this.endpoint);
    this.#agent.onopen = ev => {
      this.#isOpen = true;
    }
    this.#agent.onclose = this.handleDisconnect;

    this.#agent.onmessage = this.handleResponse;

    this.#agent.onerror = this.handleDisconnect;
  }

  _parseMessages(messageString) {
    // As per Kodi documentation we need to separate individual responses.
    // https://kodi.wiki/view/JSON-RPC_API#TCP
    let output = [];
    const messages = messageString.trim();
    let msgStart = 0;
    let counter = 0;

    for (let i = 0; i < messageString.length; i++) {
      const char = messageString[i];
      if (!char || char.match(/\s+/)) {
        continue;
      }
      if (char === '{') {
        counter += 1;
      }
      if (char === '}') {
        counter -= 1;
      }
      if (counter === 0) {
        let message = messageString.substring(msgStart, i + 1).trim();
        output.push(message);
        msgStart = i + 1;
      }

    }
    return output;
  }

  handleResponse = (ev) => {
    this._parseMessages(ev.data).forEach(msg => {
      const res = JSON.parse(msg);
      const callback = this.#requestQueue.get(res.id);
      if (typeof callback.success == 'function') {
        callback.success(res);
        this.#requestQueue.delete(res.id);
        this.#currentRequest = null;
        this.sendNext();
      }
    })
  }

  handleDisconnect = (ev) => {
    this._initSocket();
    let waitConnection = setInterval(() => {
      if (this.#agent.readyState == 1) {
        this.#requestQueue.forEach(request => {
          this.#agent.send(request.payload)
        })
        clearInterval(waitConnection);
      }
    }, 100)
  }

  sendMessage = (message, urlParams = '') => {
    const requestId = this.nextId;
    return new Promise((resolve, reject) => {
      const request = {
        payload: JSON.stringify({ ...message, id: "t" + requestId }),
        success: (res) => {
          resolve(res);
        },
        error: (err) => {
          reject(err);
        }
      }

      this.#requestQueue.set("t" + requestId, request)
      this.sendNext();
    })
  }

  sendNext = () => {
    let request = this.#currentRequest;
    let first = this.#requestQueue.keys().next().value;
    if (!request && first) {
      this.#currentRequest = this.#requestQueue.get(first);
      this.#agent.send(this.#currentRequest.payload)
    }
  }

  close = () => {
    this.#isOpen = false;
  }

  open = () => {
    this.#isOpen = true;
    return true;
  }

}


const defaultConfig = {
  host: '192.168.9.20',
  port: '9090',
  protocol: 'WS',
}

class ConnectionService {
  #config
  #conn
  init = async (config = defaultConfig) => {
    this.#config = config;
    switch ((config.protocol || "").toLocaleUpperCase()) {
      case 'WS':
        this.#conn = new SocketConnectionJsonRpc(this.#config);
        break;
      case 'HTTP':
      case 'HTTPS':
        this.#conn = new HttpConnectionJsonRpc(this.#config);
        break;
      default:
        break;
    }
  }

  get instance() {
    return this.#conn;
  }

}

const connService = new ConnectionService();

export default connService;
