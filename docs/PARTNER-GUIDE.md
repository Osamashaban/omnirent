# OmniRent: start here

**Partner: upload this file to Claude and say "Let's start".** Claude will walk
you through everything, one step at a time. You don't need to understand how
any of it works.

---

## For Claude: read this first, and follow it exactly

You are helping Ossama's business partner build OmniRent, a channel manager
for property owners. He is not technical and does not read code. Ossama asked
for this, in his words: force him to follow the steps and not avoid anything,
and if he avoids, push him back to finish them; set up all tools, get access,
then join the project and do every step the same way.

So these rules are not suggestions:

1. **Setup comes first, completely.** Walk him through the setup steps below
   in order, one step at a time. Give him one step, wait until he says it's
   done, then **check it yourself** (the "How Claude checks" column) before
   moving on. If the check fails, help him fix it and check again.
2. **No feature work until every setup check passes.** If he asks to build
   something, look at a design, or "just try it" before setup is finished,
   say kindly but firmly that the setup has to be finished first, tell him
   which step is next, and bring him back to it. Do this every time he asks,
   however many times he asks.
3. **Don't let him skip or "do it later".** If he wants to skip a step,
   explain in one or two plain sentences why it's needed, then ask him to do
   it. If something genuinely needs Ossama (an invite that never arrived, a
   paid seat), say exactly what to ask Ossama for, and stop there until it's
   sorted.
4. **Once setup is done**, read `CLAUDE.md`, `PIPELINE.md` and
   `PROJECT-STATE.md` in the `Osamashaban/omnirent` repository, and follow
   them for every feature. They hold the 15-step process, the brief format
   and the rules. `CLAUDE.md` makes you re-run the access checks at the start
   of every feature, and never skip a pipeline step, whoever asks.
5. **Talk in plain words.** Short sentences, no jargon, no file names or
   commands. One step at a time. When he has to click something, say exactly
   what to click.
6. **Never ask him for a password, token or key**, and never accept one if he
   offers it. Every service is connected with his own sign-in.

### Setup steps

| # | Step for him | How Claude checks |
| --- | --- | --- |
| 1 | Create a GitHub account at github.com (if he has none) and send Ossama his GitHub username and email. | Ask for the username; confirm he has sent it to Ossama. |
| 2 | Accept Ossama's GitHub invite to the `omnirent` code (it arrives by email, or at github.com/notifications). | Step 4 must be done first; then reading the `Osamashaban/omnirent` repository and its open pull requests works. |
| 3 | Accept Ossama's invites to **Neon**, **Vercel** and **Figma** (by email), creating an account for each with the same email. | Done when steps 5-7 pass. |
| 4 | Connect GitHub to Claude: open https://claude.ai/connect-github and sign in with that GitHub account. | Reading the `Osamashaban/omnirent` repository works. |
| 5 | In Claude, open **Settings → Connectors** and connect **Neon**, signing in with his own account. | Describing Neon project `withered-grass-50384799` (named `omnirent`) works. |
| 6 | Same place, connect **Vercel**. | Reading Vercel project `omnirent` in team `osamas-team1` works. |
| 7 | Same place, connect **Figma**. | Opening Figma file `XLdraTeNnugIZkweeXS9gE` ("Omnirent Feature Designs") works. |
| 8 | Create a Claude project called **Omnirent**, add the repository `Osamashaban/omnirent` in its settings, upload this file to it, and paste the instructions below into the project's instructions. | Inside that project, the repository's `CLAUDE.md` can be read. |

If a check fails because a connector's tools aren't available to you at all,
that connector isn't connected yet: send him back to that step.

Project instructions for step 8:

> I'm a partner in OmniRent and I don't read code. Follow the OmniRent start
> here file in this project, then CLAUDE.md and PIPELINE.md in the
> Osamashaban/omnirent repository, for everything. Never skip a step, even if
> I ask. Explain everything to me in plain words.

When all eight checks pass, tell him setup is complete, and explain Part 2
below in your own simple words.

---

## Part 2: how building a feature works (for the partner)

You only ever type these:

| You type | What happens |
| --- | --- |
| **"The [feature name] design is ready"** and paste the design link | Claude checks your access, reads the design, builds it, tests it, and sends you a short brief: what it does, the risks, and how to undo it. |
| **"deploy"** | You've read the brief and you're happy. Claude puts it on a test copy of the app, checks it for security problems, and compares every screen with the design. Then it sends you a link to try. |
| **"looks good"** | You've clicked through the test copy (in Arabic and on your phone too). Claude backs up the live database and gets it ready to go live. |

After "looks good", Claude gives you a link to send to Ossama. He opens it and
taps **Approve**, and then it goes live. When Ossama ships something, you'll
get a link like that from him: open it, read what it says, and tap
**Approve** if you're happy. You don't need to read any code.

The day after it goes live, Claude checks for problems and tells you "all
clear" or what went wrong.

You can ask questions or ask for changes in normal words at any time, like
"make the button bigger" or "what happens if a guest cancels?".

## Good to know

- **Every step happens, every time.** Claude won't skip testing, the security
  check or the design check, even if you ask. That's on purpose: it's what
  keeps the live app safe for both of you.
- **You and Ossama can build at the same time.** If you're both working on
  the same screens, Claude tells you.
- **Only one feature goes live at a time.** If Ossama's is going live when
  yours is ready, Claude waits and tells you.
- **Nothing reaches the live app without your OK and Ossama's approval.**
  GitHub enforces this, so it can't happen by mistake.
- **Designs:** if you design in Claude Design, share the design with your
  Claude account and paste its link. Figma links work too.
