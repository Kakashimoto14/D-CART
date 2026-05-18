import { ROLES } from "../constants/roles.js";
import { Admin } from "./Admin.js";
import { Customer } from "./Customer.js";
import { Staff } from "./Staff.js";

export function buildUserEntity(user) {
  if (!user) {
    return null;
  }

  if (user.role === ROLES.ADMIN) {
    return new Admin(user);
  }

  if (user.role === ROLES.STAFF) {
    return new Staff(user);
  }

  return new Customer(user);
}
