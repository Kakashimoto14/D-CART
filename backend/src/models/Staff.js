import { User } from "./User.js";

export class Staff extends User {
  constructor(data) {
    super({ ...data, role: "STAFF" });
    this.phone = data.phone || null;
  }

  getProfile() {
    return {
      ...super.getProfile(),
      phone: this.phone
    };
  }
}
