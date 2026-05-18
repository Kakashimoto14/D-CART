export class User {
  constructor({ id, name, email, role, authProvider = "LOCAL", avatarUrl = null }) {
    if (new.target === User) {
      throw new Error("User is an abstract base class and cannot be instantiated directly.");
    }

    this.id = id;
    this.name = name;
    this.email = email;
    this.role = role;
    this.authProvider = authProvider;
    this.avatarUrl = avatarUrl;
  }

  getProfile() {
    return {
      id: this.id,
      name: this.name,
      email: this.email,
      role: this.role,
      authProvider: this.authProvider,
      avatarUrl: this.avatarUrl
    };
  }

  canCheckout() {
    return false;
  }

  canManageInventory() {
    return false;
  }
}
