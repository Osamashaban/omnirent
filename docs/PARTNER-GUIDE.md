# Getting started: building OmniRent with your own Claude

This is for Ossama's partner. You don't need to know how any of the technical
parts work. Your Claude does the building, testing and shipping, and checks
with you at the moments that need a person. You do a one-time setup, then you
only type three phrases.

Setup takes about 20 minutes.

---

## Part 1: Accept the invites (one time)

Ossama invites you to each of these with your own email. Open each invite
email and accept it. If you don't have an account yet, the invite lets you
create one.

1. **GitHub**, the place where the app's code lives. Make an account at
   github.com if you don't have one, and send Ossama your GitHub username.
2. **Neon**, the database.
3. **Vercel**, where the app is hosted.
4. **Figma**, where approved designs are kept.

Nobody shares passwords. Everything you do shows under your own name.

## Part 2: Connect your Claude (one time)

1. Sign in to Claude with your own account.
2. Connect GitHub: open https://claude.ai/connect-github and sign in with the
   GitHub account Ossama invited.
3. In Claude, open **Settings**, then **Connectors**, and connect **Neon**,
   **Vercel** and **Figma**, signing in with your own accounts each time.
4. Create a new Claude project called **Omnirent**. In its settings, add the
   repository **Osamashaban/omnirent**.
5. In the project's instructions, paste this:

   > I'm a partner in OmniRent and I don't read code. For every feature,
   > follow CLAUDE.md and PIPELINE.md in the Osamashaban/omnirent repository,
   > step by step. Explain everything to me in plain words. Never ship to
   > production without my "deploy" and "looks good".

That's the setup. Your Claude now knows the whole process, because it is
written into the code itself, the same one Ossama's Claude follows.

## Part 3: Building a feature

You only ever type these:

| You type | What happens |
| --- | --- |
| **"The [feature name] design is ready"** and paste the design link | Claude reads the design, builds it, tests it, and sends you a short brief: what it does, the risks, and how to undo it. |
| **"deploy"** | You've read the brief and you're happy. Claude puts it on a test copy of the app (staging), checks it for security problems, and compares every screen with the design. Then it sends you a link to try. |
| **"looks good"** | You've clicked through the test copy (try it in Arabic and on your phone too). Claude backs up the live database and gets it ready to go live. |

After "looks good", Claude gives you a link to send to Ossama. He opens it and
taps **Approve**, and then it goes live. When Ossama ships something, you'll
get a link like that from him: open it, look at what it says, and tap
**Approve** if you're happy. You don't need to read any code.

The day after it goes live, Claude checks for problems and tells you "all
clear" or what went wrong.

At any point you can ask Claude questions or ask for changes in normal words,
like "make the button bigger" or "what happens if a guest cancels?".

## Good to know

- **You and Ossama can build at the same time.** Each of you builds different
  features. If you're both working on the same screens, Claude tells you.
- **Only one feature goes live at a time.** If Ossama's feature is going live
  when yours is ready, Claude waits for it to finish and tells you.
- **Nothing reaches the live app without your OK and Ossama's approval.**
  GitHub enforces this, so it can't be skipped by mistake.
- **Designs:** if you design in Claude Design, share the design with your
  Claude account and paste its link. Figma links work too.
- **If Claude says it can't open something**, it usually means an invite
  hasn't been accepted or a connector isn't connected. Check Parts 1 and 2,
  or ask Ossama.
