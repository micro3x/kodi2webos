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

    this.#agent = axios.create();

    this.#agent.interceptors.request.use(config => {
      // Add Auth header for all http requests if we have login info
      if (this.#user || this.#pass) {
        config.headers.Authorization = `Basic ${window.btoa(`${this.#user}:${this.#pass}`)}`;
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
    return this.#agent.post(this.endpoint + urlParams, message)
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
  #responseListeners = new Map();
  #nextId = 1;

  constructor({ protocol, host, port, username, password }) {
    this.#path = '/jsonrpc';
    this.#host = host; // TODO: Validate host pattern and assign default if needed
    this.#port = port; // TODO: Validate port pattern and assign default if needed
    this.#protocol = 'ws';

    if ("WebSocket" in window) {
      console.log("asd")
    }

    this.#agent = new window.WebSocket(this.endpoint);
    this.#agent.readyState
    this.#agent.onopen = ev => {
      this.#isOpen = true;
    }
    this.#agent.onclose = ev => {
      this.#isOpen = false;
    }

    this.#agent.onmessage = this.handleResponse;

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
      const callback = this.#responseListeners.get(res.id);
      if (typeof callback.success == 'function') {
        callback.success(res);
      }
    })
  }

  sendMessage = (message, urlParams = '') => {
    const requestId = this.nextId;
    return new Promise((resolve, reject) => {
      const callbacks = {
        success: (res) => {
          resolve(res);
        },
        error: (err) => {
          reject(err);
        }
      }

      this.#responseListeners.set("t" +requestId, callbacks)
      this.#agent.send(JSON.stringify({ ...message, id: "t" + requestId }))
    })
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
  type: 'webSocket',
  host: '192.168.9.20',
  port: '9090',
  protocol: 'ws',
}

class ConnectionService {
  #config
  #conn
  init = async (config = defaultConfig) => {
    this.#config = config;
    switch (config.type) {
      case 'webSocket':
        this.#conn = new SocketConnectionJsonRpc(this.#config);
        break;
      case 'http':
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
