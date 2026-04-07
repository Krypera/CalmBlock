import { BrowserAdapter } from "./browserAdapter";
import { webext } from "./webext";

export interface FeedbackCapability {
  matchedRuleTelemetry: boolean;
  canQueryPermission: boolean;
  canRequestPermission: boolean;
  permissionGranted: boolean | null;
}

export class PermissionManager {
  async requestFeedbackPermission(): Promise<boolean> {
    try {
      const capability = await this.getFeedbackCapability();
      const requestPermission = webext?.permissions?.request;
      if (!capability.canRequestPermission || !requestPermission) {
        return false;
      }
      return await requestPermission({ permissions: ["declarativeNetRequestFeedback"] });
    } catch {
      return false;
    }
  }

  async hasFeedbackPermission(): Promise<boolean | null> {
    const capability = await this.getFeedbackCapability();
    return capability.permissionGranted;
  }

  async getFeedbackCapability(): Promise<FeedbackCapability> {
    const capabilities = BrowserAdapter.getCapabilities();
    let permissionGranted: boolean | null = null;

    try {
      if (capabilities.optionalPermissionsQuery && webext?.permissions?.contains) {
        permissionGranted = await webext.permissions.contains({
          permissions: ["declarativeNetRequestFeedback"]
        });
      }
    } catch {
      permissionGranted = false;
    }

    return {
      matchedRuleTelemetry: capabilities.matchedRuleTelemetry,
      canQueryPermission: capabilities.optionalPermissionsQuery,
      canRequestPermission: capabilities.optionalPermissionsRequest,
      permissionGranted
    };
  }
}
