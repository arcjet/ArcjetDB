// Utils
const strToBuffer = str => new TextEncoder("utf-8").encode(str);
const bufferToStr = buffer => new TextEncoder("utf-8").decode(buffer);
const digest = (buffer, algo = "SHA-512") => crypto.subtle.digest(algo, buffer);
const digestStr = (str, algo) => digest(algo, strToBuffer(str));
const exportKey = key => crypto.subtle.exportKey("jwk", key);
const storeJWK = (name, jwk) => localStorage.setItem(name, JSON.stringify(jwk));
const loadKey = name => JSON.parse(localStorage.getItem(name));
const JSONToBuffer = obj => strToBuffer(JSON.stringify(obj));
const bytesToBlob = (arr, type) => new Blob([arr], { type });
const assert = (assertion, message) => {
  if (assertion === false) throw new Error(`Assertion Error: ${message}`);
};

// Constants
const cryptoConfig = sig =>
  sig
    ? {
        name: "ECDSA",
        hash: { name: "SHA-512" }
      }
    : {
        name: "ECDSA",
        namedCurve: "P-521"
      };

// Record
class Record {
  constructor(content, type, metadata) {
    // If an array-like is provided, it is assumed to be a ArrayBuffer
    if (content && Array.isArray(content)) {
      this.content = content;
    }
    // If an object is provided, it is assumed to be JSON
    else if (content && typeof content === 'object') {
      this.content = JSONToBuffer(content);
    }
    // If a string is provided, it is assumed to be a contentHash
    else if (content && typeof content === 'string') {
      this.contentHash = content
    }

    if (type) this.type = type;
    
    if (metadata) this.metadata = metadata;
  }

  async sign(privateKey) {
    const contentHash = await digest(this.content);
    const metadataHash = await digest(JSONToBuffer(this.metadata));

    const metadataContentBytes = new ArrayBuffer([
      ...contentHash,
      ...metadataHash
    ]);

    const signature = await crypto.subtle.sign(
      cryptoConfig(true),
      privateKey,
      metadataContentBytes
    );

    const partialRecord = new ArrayBuffer([
      ...signature,
      ...metadataContentBytes
    ]);

    const id = await digest(partialRecord);

    const record = new ArrayBuffer([...id, ...partialRecord]);

    // Format: [idHash, signature, contentHash, metadata...] + [content]
    this.id = id;
    this.record = record;
    this.signature = signature;
    this.hashes = {
      content: contentHash,
      metadata: metadataHash
    };
  }

  async verify() {
    const contentHash = await digest(this.content);
    const metadataHash = await digest(JSONToBuffer(this.metadata));

    const metadataContentBytes = new ArrayBuffer([
      ...contentHash,
      ...metadataHash
    ]);

    assert(contentHash === this.hashes.contentHash, "Content matches hash");
    assert(metadataHash === this.hashes.metadataHash, "Metadata matches hash");

    const isValid = await crypto.subtle.verify(
      cryptoConfig(true),
      this.metadata.publicKey,
      this.signature,
      metadataContentBytes
    );

    assert(isValid, "Record has a valid signature");

    const partialRecord = new ArrayBuffer([
      ...this.signature,
      ...metadataContentBytes
    ]);

    const id = digest(partialRecord);

    assert(id === this.id, "Record ID matches hash");

    this.id = id;
    this.hashes = {
      content: contentHash,
      metadata: metadataHash
    };
  }

  async get(contentHash) {
    try {
      const res = await fetch(`${this.host}/store/${contentHash}`);
      if (res.status === 200) {
        const bytes = await res.arrayBuffer();
        this.content = bytes;
      }
    } catch (err) {
      console.error(err);
      throw new Error(err);
    }
  }

  async set() {
    try {
      // Set the content in the store
      await fetch(`${this.host}/store`, {
        method: "POST",
        body: bytesToBlob(this.content, this.type)
      });

      // Set the metadata in the index
      await fetch(`${this.host}/index`, {
        method: "POST",
        body: JSON.stringify({
          metadata: this.metadata
        })
      });
    } catch (err) {
      console.error(err);
      throw new Error(err);
    }
  }
}

// Arcjet API
class Arcjet {
  constructor() {
    this.host = "http://127.0.0.1:3000";
    this.site = window.location.hostname;
  }

  async generate() {
    try {
      const key = await window.crypto.subtle.generateKey(
        cryptoConfig(false),
        true,
        ["sign", "verify"]
      );
      const { publicKey, privateKey } = key;
      const pubkey = await exportKey(publicKey);
      const privkey = await exportKey(privateKey);
      storeJWK("ARCJET_PUBLIC_KEY", pubkey);
      storeJWK("ARCJET_SECRET_KEY", privkey);
    } catch (err) {
      console.error(err);
    }
  }

  async set(content, type, metadata) {
    try {
      const privateKey = loadKey("ARCJET_PRIVATE_KEY");
      const record = new Record(content, type, metadata);

      await record.sign(privateKey);
      await record.set();

      return record;
    } catch (err) {
      console.error(err);
      throw new Error(err);
    }
  }

  async find(metadata) {
    try {
      const res = await fetch(`${this.host}/find`, {
        method: 'POST',
        body: metadata,
      })

      const results = await res.json();

      const records = results.map(result => new Record(result.contentHash, result.type, result.metadata))

      return Promise.all(records)
    }
    catch (err) {
      console.error(err);
      throw new Error(err);
    }
  }
}

// Test (TODO temporary)
const test = async () => {
  const api = new Arcjet();
  await api.generate();
  const record = new Record();
  console.log(record.sign());
  console.log(record.verify());
};

test();
