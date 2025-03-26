// @ts-strict-ignore

/** @import { BindingObject } from '../support/sparql.js' */

export default class Attachment {
  /** @param {BindingObject} bound */
  static fromBinding({ uri, decision, file, type, filename, fileUuid }) {
    return new Attachment({
      uri: uri.value,
      decision: decision.value,
      file: file?.value,
      type: type?.value,
      filename: filename?.value,
      fileUuid: fileUuid?.value,
    });
  }

  constructor({ uri, decision, file, type, filename, fileUuid }) {
    this.uri = uri;
    this.decision = decision;
    this.file = file;
    this.type = type;
    this.filename = filename;
    this.fileUuid = fileUuid;
  }
}
