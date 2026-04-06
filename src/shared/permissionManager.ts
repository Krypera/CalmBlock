import { webext } from "./webext";

export class PermissionManager {
  async requestFeedbackPermission(): Promise<boolean> {
    try {
      if (!webext?.permissions?.request) {
        return false;
      }
      return await webext.permissions.request({ permissions: ["declarativeNetRequestFeedback"] });
    } catch {
      return false;
    }
  }

  async hasFeedbackPermission(): Promise<boolean> {
    try {
      if (!webext?.permissions?.contains) {
        return false;
      }
      return await webext.permissions.contains({ permissions: ["declarativeNetRequestFeedback"] });
    } catch {
      return false;
    }
  }
}
