---
name: Chat performance
description: Durable rules for keeping group chat history and message sends responsive.
---

Chat history should be requested for the active public channel, DM, or group only, with a bounded recent-history window and indexes matching channel membership and message ordering. Message sends should update the active query cache immediately instead of invalidating and downloading the entire history.

**Why:** The application stores media as data URLs in message rows, so an all-channel polling query grows quickly and makes both history loading and post-send refreshes feel slow.

**How to apply:** Preserve channel-scoped query keys and database indexes when changing chat polling, pagination, media, or message mutation behavior. Add explicit pagination before removing the recent-history bound.