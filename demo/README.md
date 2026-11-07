# VT-Harness: one-minute hackathon demo

The demo contains **23 synthetic sessions: 16 teaching sessions and seven practice sessions**, with **96 concepts and 53 reasoning chains**. It retains the neural-network learning story for the one-minute pitch and adds undergraduate Maths, Physics, Biology, History, and Medicine. Every graph concept links back to a passage in a teaching session. Medicine uses fictional physiology and probability exercises; History clearly distinguishes invented source exercises from real archival material.

All sample conversations, quiz answers, and learning records are **synthetic demonstration data**. They are not a real learner's history or evidence of measured educational outcomes. New messages use the real provider you configure.

## Start and rehearse

From the repository root, with Node.js 26:

```bash
npm ci
npm run demo
```

Open **[localhost:3006](http://localhost:3006)**. Keep the terminal open. Stop the server with **Ctrl+C**. To use a different port, run `npm run demo -- --port 3007` and adjust the links below.

The launcher imports existing nonsecret settings on its first run and uses the same provider credentials and environment configuration as ordinary `npm run dev`. Credentials are not copied into this folder. If no models were previously selected, choose **Strong**, **Cheap**, and **Vision** in Settings before the pitch. If your provider still needs connecting, do that during rehearsal as well. Changes to demo model settings stay in the demo profile.

New messages and practice problems use your configured provider and its normal limits/billing. Browsing the saved lessons and graph needs no model generation. A model response has variable latency, so the prepared sessions carry the core one-minute story.

Open the graph and the main lesson once before presenting so the development server compiles them. Fit the expanded graph to the viewport, then zoom into a lesson cluster; the app remembers the camera in that browser. Keep the gradient-descent lesson ready for the one-minute pitch. Rehearse the live question with the provider and network you intend to use. If you have rehearsed changes you want to discard, stop the server and reset:

```bash
npm run demo:reset
npm run demo
```

Reset restores the sample conversations and graph, including layout, and removes demo-created sessions/jobs. It preserves demo settings and provider connections. A reset is refused while the demo launcher is running. Normal restarts keep your demo work; they do not reset it. Your regular learning data is separate.

If your demo profile was created before the university examples were added, it keeps that existing history until you explicitly reset it. Copy `demo/.runtime/data/` elsewhere first if you want to keep rehearsal conversations before loading the expanded samples.

## 60-second pitch

| Time | Show | Say |
| --- | --- | --- |
| 0–10s | [Knowledge graph](http://localhost:3006) | “Most AI tutors forget what happened after the chat. VT-Harness connects learning across sessions.” |
| 10–30s | [Gradient descent lesson](http://localhost:3006/chat/chat_demo_gradient-descent#message-msg_demo_gradient-descent_11) | “It first checks the learner's understanding and builds a plan. Here the learner predicts the wrong direction of an update. The tutor explains the specific mistake, then checks the corrected reasoning.” |
| 30–43s | [Transfer practice](http://localhost:3006/chat/chat_demo_practice-updates) | “Then it tests a fresh example. The learner has to work out the answer, rather than repeat the explanation.” |
| 43–53s | Graph, then select **A descent direction** and its session source | “The reasoning becomes a connected knowledge graph, with a link back to where it was learned.” |
| 53–60s | Return to the gradient descent lesson; optionally send the prepared question | “This is a continuing tutor with a memory. We can ask the next question using our own AI provider.” |

Prepared live question: **“What happens in our example if the learning rate is 1 instead of 0.1?”** Paste it into the gradient descent session. It reuses the lesson's existing context. If a response is still streaming when the minute ends, finish on the graph or the completed practice example.

The seed's key arithmetic: initial prediction 3, target 5, loss 4, and weight gradient −8. Updating weight 1 with learning rate 0.1 gives weight 1.8, prediction 4.6, and loss 0.16. The sample learner initially chose 0.2; the saved prediction card correctly marks that choice wrong.

## Direct session links

| Session | Link |
| --- | --- |
| From data to predictions | [/chat/chat_demo_data](http://localhost:3006/chat/chat_demo_data) |
| How a loss function gives feedback | [/chat/chat_demo_loss](http://localhost:3006/chat/chat_demo_loss) |
| Why neural networks need nonlinearity | [/chat/chat_demo_networks](http://localhost:3006/chat/chat_demo_networks) |
| Backpropagation is the chain rule | [/chat/chat_demo_backprop](http://localhost:3006/chat/chat_demo_backprop) |
| Training that generalises | [/chat/chat_demo_generalisation](http://localhost:3006/chat/chat_demo_generalisation) |
| Gradient descent: learning from mistakes | [/chat/chat_demo_gradient-descent](http://localhost:3006/chat/chat_demo_gradient-descent) |
| Practice: one update without a hint | [/chat/chat_demo_practice-updates](http://localhost:3006/chat/chat_demo_practice-updates) |
| Practice: spot a misleading training score | [/chat/chat_demo_practice-generalisation](http://localhost:3006/chat/chat_demo_practice-generalisation) |

## University examples

Each row adds two teaching sessions, twelve concepts, and one completed transfer practice. Teaching sessions include a plan, an initial probe, a wrongly answered prediction, a misconception repair, and a successful follow-up check. The existing neural-network pitch links above remain available.

| Discipline | Lessons | Practice |
| --- | --- | --- |
| Maths | [Eigenvectors](http://localhost:3006/chat/chat_demo_maths-eigenvectors) · [Differential equations](http://localhost:3006/chat/chat_demo_maths-differential-equations) | [Eigenvectors through time](http://localhost:3006/chat/chat_demo_practice-maths) |
| Physics | [Spring oscillations](http://localhost:3006/chat/chat_demo_physics-oscillations) · [Energy conservation](http://localhost:3006/chat/chat_demo_physics-energy) | [Predict an oscillator's speed](http://localhost:3006/chat/chat_demo_practice-physics) |
| Biology | [Gene regulation](http://localhost:3006/chat/chat_demo_biology-gene-regulation) · [Selection and drift](http://localhost:3006/chat/chat_demo_biology-evolution) | [Regulation or evolution?](http://localhost:3006/chat/chat_demo_practice-biology) |
| History | [French Revolution](http://localhost:3006/chat/chat_demo_history-french-revolution) · [Source criticism](http://localhost:3006/chat/chat_demo_history-source-criticism) | [Critique an argument about 1789](http://localhost:3006/chat/chat_demo_practice-history) |
| Medicine | [Cardiovascular physiology](http://localhost:3006/chat/chat_demo_medicine-cardiovascular) · [Diagnostic probability](http://localhost:3006/chat/chat_demo_medicine-diagnostic-probability) | [Rebuild a screening table](http://localhost:3006/chat/chat_demo_practice-medicine) |

For an alternative pitch, show one wrongly answered prediction, the explanation that repairs it, then its linked practice session and graph cluster. Maths links its eigenvector and differential-equation lessons; Physics links force, frequency, and energy. No subject-similarity links are inserted merely to join unrelated disciplines.

## Folder contents

- `seed/` contains the committed sessions, graph ledgers, layout, coverage records, and a manifest. It contains no credentials or pinned live model.
- `content.ts` contains the authored lesson text, questions, concepts, and practice problems.
- `disciplines.ts` contains the five university disciplines, their worked examples, reasoning chains, source references, and practice problems.
- `dataset.ts` constructs records using the application's native transcript and grading helpers.
- `generate.ts` regenerates `seed/`: `node --import tsx demo/generate.ts`.
- `start.mjs` and `runtime.mjs` initialise/reset the demo and launch Next.js.
- `.runtime/data/` is the ignored working copy used by the demo server. Edit or continue sessions through the app; reset when needed.

The demo has its own Next.js cache in `.next-demo/`, so it can run beside the normal server. Provider credentials stay wherever the normal app reads them (`VT_AUTH_FILE` and the adjacent subscription files, or environment variables). Demo and normal servers use that same provider account; sign out or reconnect only if you intend to change that connection.
