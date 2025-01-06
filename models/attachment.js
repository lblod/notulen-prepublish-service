// @ts-strict-ignore

export default class Attachment {
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
