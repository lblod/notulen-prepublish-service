export default class Mandatee {
  // eslint doenst like class fields yet?
  // uri;
  // personUri;
  // name;
  // familyName;
  // positionUri;
  // roleUri;
  // role;
  constructor(bindings) {
    this.uri = bindings.mandatarisUri?.value;
    this.personUri = bindings.personUri?.value;
    this.name = bindings.name?.value;
    this.familyName = bindings.familyName?.value;
    this.role = bindings.role?.value;
    this.roleUri = bindings.roleUri?.value;
    this.positionUri = bindings.positionUri?.value;
  }
}
