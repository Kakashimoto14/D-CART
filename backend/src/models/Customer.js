import { User } from "./User.js";
import { ROLES } from "../constants/roles.js";

export class Customer extends User {
  constructor(payload) {
    super({ ...payload, role: ROLES.CUSTOMER });
  }

  canCheckout() {
    return true;
  }
}
