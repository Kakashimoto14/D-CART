import { User } from "./User.js";
import { ROLES } from "../constants/roles.js";

export class Admin extends User {
  constructor(payload) {
    super({ ...payload, role: ROLES.ADMIN });
  }

  canManageInventory() {
    return true;
  }
}
