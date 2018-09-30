// Utils
const strToBuffer = str => new TextEncoder("utf-8").encode(str);
const bufferToStr = buffer => new TextEncoder("utf-8").decode(buffer);
const toBytes = buffer => new Uint8Array(buffer);
const digest = (buffer, algo = "SHA-512") =>
  toBytes(crypto.subtle.digest(algo, buffer));
const digestStr = (str, algo) => digest(algo, strToBuffer(str));
const exportKey = key => crypto.subtle.exportKey("jwk", key);
const storeKey = (name, jwk) => localStorage.setItem(name, JSON.stringify(jwk));
const loadKey = (name, usage) =>
  crypto.subtle.importKey(
    "jwk",
    JSON.parse(localStorage.getItem(name)),
    cryptoConfig(),
    true,
    [usage]
  );
const JSONToBuffer = obj => strToBuffer(JSON.stringify(obj));
const bytesToBlob = (arr, type) => new Blob([arr], { type });
const assert = (assertion, message) => {
  if (!assertion) throw new Error(`Assertion Error: ${message}`);
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
    if (content) this.content = content;

    if (type) this.type = type;

    if (metadata) this.metadata = metadata;
  }

  async sign() {
    assert(
      this.content && this.content.length > 0,
      "There must be content in the record to sign"
    );
    assert(
      this.content instanceof Uint8Array,
      "Content must be an ArrayBuffer"
    );

    const publicKey = await loadKey("ARCJET_PUBLIC_KEY", 'verify');
    const privateKey = await loadKey("ARCJET_SECRET_KEY", 'sign');

    const contentHash = await digest(this.content);
    const metadataHash = await digest(JSONToBuffer(this.metadata));

    const metadataContentBytes = new Uint8Array([
      ...contentHash,
      ...metadataHash
    ]);

    const signature = await crypto.subtle.sign(
      cryptoConfig(true),
      privateKey,
      metadataContentBytes
    );

    const partialRecord = new Uint8Array([
      ...toBytes(signature),
      ...metadataContentBytes
    ]);

    const id = await digest(partialRecord);

    const record = new Uint8Array([...id, ...partialRecord]);

    // Format: [idHash, signature, contentHash, metadata...] + [content]
    this.record = record;

    this.metadata = {
      id,
      signature,
      contentHash,
      metadataHash,
      publicKey,
    };
  }

  async verify() {
    const contentHash = await digest(this.content);
    const metadataHash = await digest(JSONToBuffer(this.metadata));

    const metadataContentBytes = new Uint8Array([
      ...contentHash,
      ...metadataHash
    ]);

    assert(contentHash === this.metadata.contentHash, "Content matches hash");
    assert(metadataHash === this.metadata.metadataHash, "Metadata matches hash");

    const isValid = await crypto.subtle.verify(
      cryptoConfig(true),
      this.metadata.publicKey,
      this.metadata.signature,
      metadataContentBytes
    );

    assert(isValid, "Record has a valid signature");

    const partialRecord = new Uint8Array([
      ...this.metadata.signature,
      ...metadataContentBytes
    ]);

    const id = digest(partialRecord);

    assert(id === this.metadata.id, "Record ID matches hash");

    this.metadata = {
      id,
      signature,
      contentHash,
      metadataHash
    };
  }
}

// Arcjet API
class Arcjet {
  constructor() {
    this.host = "http://localhost:8000";
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
      storeKey("ARCJET_PUBLIC_KEY", pubkey);
      storeKey("ARCJET_SECRET_KEY", privkey);
    } catch (err) {
      console.error(err);
    }
  }

  async get(contentHash, type, metadata) {
    try {
      const res = await fetch(`${this.host}/store/${contentHash}`);
      if (res.status === 200) {
        const bytes = await res.arrayBuffer();
        return new Record(new Uint8Array(bytes), type, metadata);
      }
    } catch (err) {
      console.error(err);
      throw new Error(err);
    }
  }

  async set(content, type, metadata) {
    try {
      const record = new Record(content, type, metadata);

      await record.sign();

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

      return record;
    } catch (err) {
      console.error(err);
      throw new Error(err);
    }
  }

  async find(query) {
    try {
      const res = await fetch(`${this.host}/find`, {
        method: "POST",
        body: query
      });

      const results = await res.json();

      const records = results.map(result =>
        this.get(result.contentHash, result.type, result)
      );

      return Promise.all(records);
    } catch (err) {
      console.error(err);
      throw new Error(err);
    }
  }
}

// Test (TODO temporary)
const test = async () => {
  const api = new Arcjet();
  await api.generate();
  const record = await api.get("testhash");
  console.log(record);
  console.log(await record.sign());
  console.log(await record.verify());
};

test();
