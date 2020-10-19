"use strict";

const assert = require("assert");
const async = require("async");
const base62 = require("./base62");
const crypto = require("crypto");

const UINT32_CAPACITY = 0xffffffff + 1;

class EasyNoPassword {
	/**
   * Create a new token handler instance for easy-no-password.
   *
   * @param secret  A secret string to be used as a salt when creating tokens.  Anyone with access to this secret will be able to create a valid token for any user!  Should be long enough to prevent brute-force attacks.
   * @param maxTokenAge  The maximum number of milliseconds for which a token is considered valid.  Defaults to 5 minutes (900000 milliseconds).
   */
	constructor(secret, maxTokenAge) {
		if (!secret) {
			throw new Error("You must provide a secret!");
		}

		this.secret = new Buffer.from(secret);
		this.maxTokenAge = maxTokenAge || 900000; // 15 minutes
		this.iterations = 1000;

		// Use a zero vector as the default IV.  It isn't necessary to enforce distinct ciphertexts.
		this.iv = new Buffer.alloc(8);
		this.iv.fill(0);
	}

	/**
   * Create a no-password auth token.  Can be emailed or texted to the user.
   *
   * @param username  An identifier for this user, which could be their username, user ID, email address, and so forth.  This is required to ensure that tokens are unique to a particular user.
   * @param next(err,token)  A callback function that will be called with the token.  The first argument will be a possible error.  If there is an error, the second argument is undefined.
   */
	createToken(username, next) {
		if (!username) {
			throw new Error("An identifier for the user is required.");
		}
		if (typeof username !== "string") {
			throw new Error("The first argument must be a username string.");
		}

		let timestamp = new Date().getTime();
		this._encrypt(timestamp, username, next);
	}

	/**
   * Parse a no-password auth token and ensure that it was created no more than the number of milliseconds in the past specified in the constructor.
   *
   * @param token  A token, probably created by {@link #createToken}.
   * @param username  The identifier used when creating the token.
   * @param next(err,isValid)  A callback function that will be called with a boolean, which is true if the token is valid, or false if the token is invalid.  If an error occurs, the second parameter will be false.  The error is never propagated out of this function.
   */
	isValid(token, username, next) {
		if (!username) {
			throw new Error("An identifier for the user is required.");
		}
		if (typeof token !== "string") {
			throw new Error("The first argument must be a token string.");
		}
		if (typeof username !== "string") {
			throw new Error("The first argument must be a username string.");
		}

		async.waterfall(
			[
				(_next) => {
					this._decrypt(token, username, _next);
				},
				(timestamp, _next) => {
					let currentTimestamp = new Date().getTime();
					// Check to make sure the timestamp is within the acceptable window
					let isValid =
            currentTimestamp - timestamp < this.maxTokenAge &&
            currentTimestamp - timestamp > 0;
					return _next(null, isValid);
				},
			],
			next
		);
	}

	/**
   * Encrypts a timestamp into a token string.  Uses Blowfish, which has a block size of 64 bits, appropriate for a timestamp.
   */
	_encrypt(timestamp, username, next) {
		async.waterfall(
			[
				(_next) => {
					this._createKey(username, _next);
				},
				(key, _next) => {
					// timestamp -> buffer
					let buffer = new Buffer.alloc(8);
					buffer.writeUInt32BE(timestamp / UINT32_CAPACITY, 0, true);
					buffer.writeUInt32BE(timestamp % UINT32_CAPACITY, 4, true);

					// buffer -> encrypted
					let cipher = crypto.createCipheriv("bf", key, this.iv);
					cipher.setAutoPadding(false);
					let encrypted = cipher.update(buffer);
					assert.strictEqual(0, cipher.final().length);

					// encrypted -> token
					let token = base62.encode(encrypted);

					_next(null, token);
				},
			],
			next
		);
	}

	/**
   * Decrypts a token string into a timestamp.
   */
	_decrypt(token, username, next) {
		async.waterfall(
			[
				(_next) => {
					this._createKey(username, _next);
				},
				(key, _next) => {
					// token -> encrypted
					// This can fail if an invalid token is passed.  Fail silently and return timestamp zero.
					let encrypted;
					try {
						encrypted = base62.decode(token);
					} catch (err) {
						return _next(null, 0);
					}

					// encrypted -> buf
					let decipher = crypto.createDecipheriv("bf", key, this.iv);
					decipher.setAutoPadding(false);
					let buffer = decipher.update(encrypted);
					assert.strictEqual(0, decipher.final().length);

					// buffer -> timestamp
					let timestamp = 0;
					timestamp += buffer.readUInt32BE(0) * UINT32_CAPACITY; // note: timestamps are small enough that there is no floating-point overflow happening here
					timestamp += buffer.readUInt32BE(4);

					_next(null, timestamp);
				},
			],
			next
		);
	}

	/**
   * Creates an encryption key from the secret specified in the constructor and the provided username.
   */
	_createKey(username, next) {
		let usernameBuffer = new Buffer.from(username, "utf-8");
		if (crypto.pbkdf2.length === 5) {
			// Node.JS v0.10
			crypto.pbkdf2(usernameBuffer, this.secret, this.iterations, 16, next);
		} else {
			// Node.JS v0.12+
			crypto.pbkdf2(
				usernameBuffer,
				this.secret,
				this.iterations,
				16,
				"sha512",
				next
			);
		}
	}
}

module.exports = EasyNoPassword;
