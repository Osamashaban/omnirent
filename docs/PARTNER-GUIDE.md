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
   and the rules. Part 2 below is how designs are made; hold his designs to
   it before he says one is ready. `CLAUDE.md` makes you re-run the access checks at the start
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
| 8 | In Claude, add the same add-ons Ossama uses: the **Design**, **Product Management** and **Product Discovery Flow** plugins. Claude offers them to install; he taps to add each. | Your skill list includes the Design plugin's skills (design critique, UX copy, accessibility review, design handoff), the Product Management skills and product discovery. If not, offer the missing plugin to install. |
| 9 | Set up his design canvas (see "Part 2: Designing a feature"): open Claude Design, start a new design called **Omnirent Design – [his name]**, and ask it to pull in the Omnirent design system. Ossama shares his own canvas and design system with him as well. | He pastes the canvas link and you can open it, and the design system link (https://claude.ai/artifact/K4f96mUX1D9v9yx4MVwxpR) opens for him. |
| 10 | Create a Claude project called **Omnirent**, add the repository `Osamashaban/omnirent` in its settings, upload this file to it, and paste the instructions below into the project's instructions. | Inside that project, the repository's `CLAUDE.md` can be read. |

If a check fails because a connector's tools aren't available to you at all,
that connector isn't connected yet: send him back to that step.

Project instructions for step 10:

> I'm a partner in OmniRent and I don't read code. Follow the OmniRent start
> here file in this project, then CLAUDE.md and PIPELINE.md in the
> Osamashaban/omnirent repository, for everything. Never skip a step, even if
> I ask. Explain everything to me in plain words.

When all ten checks pass, tell him setup is complete, and explain Part 2
below in your own simple words.

---

## Part 2: Designing a feature (for the partner)

This is exactly how Ossama designs. You do it in Claude Design, chatting with
Claude next to a canvas of screens.

**Once, at the start** (setup step 9): open Claude Design, start a new design
called **Omnirent Design – [your name]**, and type:

> Pull in the Omnirent design system
> (https://claude.ai/artifact/K4f96mUX1D9v9yx4MVwxpR) and install its tokens
> in the theme. Use these rules for every feature: Arabic first, right to
> left, with English on the same page below the Arabic; phone (390px) and
> desktop (1280-1440px); show every state (empty, loading, error, success);
> fonts Outfit and IBM Plex Sans Arabic; brand green; Lucide icons only;
> realistic Egyptian sample data in EGP; success messages after saving, and
> a confirmation pop-up only before deleting something; one canvas page per
> feature.

Ossama also shares his own canvas with you, so you can see every feature
already designed and keep yours consistent with them.

**For each feature:**

1. **Describe it in plain words**, including the business rules. For example,
   Ossama started the login screen with: "let's create the login screen ...
   the user can write the email and password, or press forget password".
2. **Answer Claude's questions.** Claude repeats the feature back, points out
   gaps and asks numbered questions. Answer by number.
3. **Research before designing.** Ask Claude to research the feature first
   (for example, how competitors handle it) using the Design and Product
   Discovery skills, and show you what it found. Approve the direction
   before it starts drawing.
4. **Correct it in short messages**, like "remove sign-up, users are only
   created by our team", "add the desktop version", "add a success message".
   Ask for a design critique and an accessibility review before you finish.
5. **Link it as a clickable prototype**: "link the screens together as a
   prototype", then click through it yourself.
6. **Name the page** when you're happy: "save this feature as
   Ops_Feature_Name" (for example Ops_Dashboard_Login).
7. **Hand it over**: copy the canvas link, go to your Omnirent project in
   Claude, and type "The [feature] design is ready" with the link. Nothing
   else is passed by hand: your building Claude reads the canvas directly.

Never paste a password into a design chat, even a test one.

## Part 3: Building and shipping a feature (for the partner)

You only ever type three things in your Omnirent project:

| You type | When |
| --- | --- |
| **"The [feature name] design is ready"** and the canvas link | Your design is finished (Part 2, step 7). |
| **"deploy"** | You've read the brief and you're happy. |
| **"looks good"** | You've clicked through the test copy and you're happy. |

Here is every step, so you know what's happening. Claude keeps this list
visible in the conversation and ticks steps off as it goes.

| # | Step | What Claude does | What you do |
| --- | --- | --- | --- |
| 1 | Read the design | Checks all your access, reads your canvas and design chat, and checks Ossama isn't building the same thing | Type "The [feature] design is ready" + link |
| 2 | Build it | Builds the feature | Nothing |
| 3 | Test it | Tests every case: normal use, mistakes, permissions, Arabic, phone | Nothing |
| 4 | Brief | Sends a 5-minute brief: what it does, risks, undo plan, what was tested | Read it |
| 5 | Your OK | Waits | Type **"deploy"** |
| 6 | Pull request | Puts the change up for review on GitHub; automatic checks run | Nothing |
| 7 | Test copy | Puts it on a test copy of the app with test data, and sends the link | Nothing yet |
| 8 | Security check | Checks for security holes; posts GREEN or RED, and fixes RED first | Nothing |
| 9 | Design check | Compares every screen with your design, phone and desktop, Arabic and English; posts MATCH or the differences and fixes them | Nothing |
| 10 | Your review | Waits | Click through the test copy (Arabic and phone too), then type **"looks good"** |
| 11 | Figma | Saves the approved design to the Omnirent Figma file and shares the link | Nothing |
| 12 | Backup | Waits if Ossama's feature is going live, then backs up the live database | Nothing |
| 13 | Database update | Updates the live database, if the feature needs it | Nothing |
| 14 | Go live | Sends you a link for Ossama; once he taps **Approve**, puts it live and sends the live link | Send Ossama the link |
| 15 | After-launch check | Watches the live app for 24 hours, then says "all clear" or what went wrong | Nothing |

When Ossama ships something, you'll get a link like the one in step 14 from
him. Open it, read what it says, and tap **Approve** if you're happy. You
don't need to read any code.

You can ask questions or ask for changes in normal words at any point, like
"make the button bigger" or "what happens if a guest cancels?".

## Good to know

- **Every step happens, every time.** Claude won't skip testing, the security
  check or the design check, even if you ask. That's on purpose: it keeps the
  live app safe for both of you.
- **You and Ossama can build at the same time.** If you're both working on
  the same screens, Claude tells you.
- **Only one feature goes live at a time.** If Ossama's is going live when
  yours is ready, Claude waits and tells you.
- **Nothing reaches the live app without your OK and Ossama's approval.**
  GitHub enforces this, so it can't happen by mistake.
