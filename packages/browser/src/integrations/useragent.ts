import { addGlobalEventProcessor, getCurrentHub } from '@sentry/core';
import { Event, Integration } from '@sentry/types';
import { getGlobalObject } from '@sentry/utils';

const globalObj = getGlobalObject<Window>();

/** UserAgent */
export class UserAgent implements Integration {
  /**
   * @inheritDoc
   */
  public static id: string = 'UserAgent';

  /**
   * @inheritDoc
   */
  public name: string = UserAgent.id;

  /**
   * @inheritDoc
   */
  public setupOnce(): void {
    addGlobalEventProcessor((event: Event) => {
      if (getCurrentHub().getIntegration(UserAgent)) {
        // if none of the information we want exists, don't bother
        if (!globalObj.navigator && !globalObj.location && !globalObj.document) {
          return event;
        }

        // grab as much info as exists and add it to the event
        const url = (event.request && event.request.url) || (globalObj.location && globalObj.location.href);
        const { referrer } = globalObj.document || {};
        const { userAgent } = globalObj.navigator || {};

        const headers = {
          ...(event.request && event.request.headers),
          ...(referrer && { Referer: referrer }),
          ...(userAgent && { 'User-Agent': userAgent }),
        };
        const request = { ...(url && { url }), headers };

        return { ...event, request };
      }
      return event;
    });
  }
}
