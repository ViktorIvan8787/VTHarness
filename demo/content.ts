/** Authored sample learning history. All people, answers, and sessions are synthetic. */
import { disciplineLessons, disciplineArguments, disciplinePractices } from "./disciplines.ts";
export interface DemoQuiz {
	question: string;
	options: string[];
	correct: number;
	selected?: number;
	explanation: string;
	thinking: string;
}
export interface DemoLesson {
	slug: string;
	title: string;
	goal: string;
	opening: string;
	concepts: [string, string, string][];
	probe: DemoQuiz;
	predict: DemoQuiz;
	check: DemoQuiz;
	example: string;
	misconception: string;
	repair: string;
	transfer: string;
}

export const lessons: DemoLesson[] = [
	{
		slug: "data", title: "From data to predictions", goal: "Explain what a model learns from labelled examples.",
		opening: "I can write Python, but I don't understand what a neural network actually learns. Can we start with one tiny example?",
		concepts: [
			["features", "Features", "A supervised example pairs measured input features x with a target label y."],
			["predictor", "A parameterised prediction", "A scalar affine predictor computes a prediction as y_hat = w × x + b, where w and b are adjustable parameters."],
			["forward", "A forward pass", "A forward pass evaluates a model with its current parameters, without changing those parameters."],
			["prediction", "A concrete prediction", "For y_hat = w × x + b with x = 2, w = 1 and b = 1, the prediction is 3."],
			["residual", "Prediction error", "For a prediction of 3 and target 5, the residual prediction minus target is -2."],
			["squared", "Squared error", "Squared-error loss is (prediction - target)^2, so prediction 3 and target 5 give loss 4."],
		],
		probe: { question: "What changes when this model is trained?", options: ["Its adjustable parameters", "The target labels", "The arithmetic rules"], correct: 0, explanation: "Training changes the model's parameters to improve its predictions; the training labels provide the reference.", thinking: "The model must adjust its numbers rather than rewrite the answers in the data." },
		predict: { question: "For x = 2, w = 1 and b = 1, what does the forward pass predict?", options: ["2", "3", "5"], correct: 1, explanation: "Substitute into w × x + b: 1 × 2 + 1 = 3.", thinking: "I multiply the input by the weight and then add the bias." },
		check: { question: "The target is 5 and the prediction is 3. What is the squared-error loss?", options: ["-2", "2", "4"], correct: 2, explanation: "The residual is -2. Squaring it gives 4, a nonnegative penalty.", thinking: "The signed error is useful for direction, but the squared loss measures the penalty." },
		example: "### One example, no magic\nSuppose the input is two hours of study and the target is a score of five. Our toy model currently predicts three. The forward pass is just `1 × 2 + 1 = 3`. The learning problem is to decide how to change the two adjustable numbers so that the next prediction is better.",
		misconception: "So does the forward pass already update the weight when it sees that the answer is wrong?",
		repair: "The forward pass only makes a prediction. Comparing it with the label gives an error; a later gradient calculation and update use that error to change parameters. Keeping prediction and update separate lets us explain every step.",
		transfer: "You can now distinguish four things: the input, the target, the prediction, and the parameters. Next we need a signal that tells us which parameter changes reduce the error.",
	},
	{
		slug: "loss", title: "How a loss function gives feedback", goal: "Derive the weight gradient of a one-parameter prediction.",
		opening: "We measured the error, but how does one number tell a model which weight to change?",
		concepts: [
			["loss-slope", "The loss slope", "For squared-error loss L = (y_hat - y)^2, the derivative with respect to y_hat is 2 × (y_hat - y)."],
			["weight-sensitivity", "Weight sensitivity", "For y_hat = w × x + b, the derivative of y_hat with respect to w is x."],
			["weight-gradient", "The weight gradient", "For L = (w × x + b - y)^2, the weight derivative is dL/dw = 2 × (w × x + b - y) × x."],
			["gradient-example", "A gradient of minus eight", "With x = 2, w = 1, b = 1 and y = 5, the squared-error weight gradient is -8."],
			["empirical-loss", "Average training loss", "The empirical loss of N examples is the arithmetic mean of their per-example losses."],
			["mean-gradient", "Average gradient", "For differentiable per-example losses, the gradient of their arithmetic mean is the arithmetic mean of their gradients."],
		],
		probe: { question: "If the prediction is below the target, what is the sign of prediction minus target?", options: ["Negative", "Positive", "Always zero"], correct: 0, explanation: "Subtracting a larger target from a smaller prediction gives a negative residual.", thinking: "Three minus five is minus two, so the sign is negative." },
		predict: { question: "For prediction 3 and target 5, what is the derivative of squared loss with respect to the prediction?", options: ["-4", "4", "-2"], correct: 0, explanation: "The derivative is 2 × (3 - 5) = -4. Increasing the prediction a little initially decreases the loss.", thinking: "I first guessed the error itself, but differentiating the square introduces a factor of two." },
		check: { question: "If dL/dy_hat = -4 and dy_hat/dw = 2, what is dL/dw?", options: ["-2", "-8", "8"], correct: 1, explanation: "The chain rule multiplies the two local sensitivities: -4 × 2 = -8.", thinking: "The weight changes the prediction, and the prediction changes the loss. I multiply those effects." },
		example: "### Follow the effect of one weight\nOur prediction is three, the target is five, and the input is two. The loss changes at rate −4 per unit of prediction. The prediction changes at rate 2 per unit of weight. Together that gives −8 per unit of weight. This is feedback with a direction, not just a badness score.",
		misconception: "A negative gradient sounds like the weight should get smaller. Is that right?",
		repair: "A negative derivative says increasing the weight makes the loss decrease locally. The update subtracts the gradient, so subtracting a negative value increases the weight. The sign describes the slope of the loss, rather than a command to copy that sign.",
		transfer: "For many examples we average their losses and gradients. That gives one update direction that reflects the training batch rather than a single example.",
	},
	{
		slug: "networks", title: "Why neural networks need nonlinearity", goal: "Explain why stacking linear layers alone does not create a nonlinear model.",
		opening: "If one layer is simple, why can't we get a powerful network just by stacking lots of linear layers?",
		concepts: [
			["affine-layer", "An affine layer", "An affine neural-network layer computes W × x + b for a weight matrix W and bias vector b."],
			["composition", "Composing affine layers", "Composing W1 × x + b1 with W2 × z + b2 gives (W2 × W1) × x + W2 × b1 + b2."],
			["collapse", "Linear layers collapse", "Any finite composition of affine layers can be represented by a single affine layer."],
			["relu", "ReLU", "The ReLU activation maps a scalar z to max(0, z)."],
			["relu-values", "A bend at zero", "ReLU maps -1, 0 and 1 to 0, 0 and 1 respectively; those three input-output points do not lie on one straight line."],
			["nonlinear", "Nonlinear transformations", "Because ReLU is not affine, inserting it between affine layers allows models that cannot be represented by a single affine transformation."],
		],
		probe: { question: "What shape does y = w × x + b describe for scalar x?", options: ["A straight line", "Every possible curve", "Only a horizontal line"], correct: 0, explanation: "It is a line with slope w and intercept b; choosing different parameters changes that line.", thinking: "The slope is constant, even if I change the weight." },
		predict: { question: "If z = 2 × x + 1 and y = 3 × z - 2, what is y?", options: ["6 × x + 1", "6 × x - 2", "A nonlinear curve"], correct: 0, explanation: "Substitute z: 3 × (2 × x + 1) - 2 = 6 × x + 1. The result is still affine.", thinking: "There are two operations, but after substitution the shape is still a line." },
		check: { question: "What do ReLU(-1), ReLU(0) and ReLU(1) equal?", options: ["-1, 0, 1", "0, 0, 1", "1, 0, 1"], correct: 1, explanation: "ReLU keeps positive inputs and clips negative inputs to zero, creating a bend at zero.", thinking: "The negative input is clipped. That bend is what a single straight line cannot reproduce." },
		example: "### Depth needs a change of shape\nWrite down two scalar layers: `z = 2x + 1` and `y = 3z − 2`. Expanding them gives `y = 6x + 1`. Adding more affine layers repeats this pattern. Now insert `max(0, z)` between them. The output can bend where z crosses zero, so the earlier collapse no longer applies.",
		misconception: "Then a deeper network must always be better because it has more bends?",
		repair: "Nonlinearity gives the model the ability to express different functions; it does not guarantee that training will find a useful one. Data, architecture, optimisation, and evaluation still matter. More capacity can also fit noise.",
		transfer: "We have a forward computation made of small steps. Backpropagation will work backwards through those same steps to calculate how each weight affects the loss.",
	},
	{
		slug: "backprop", title: "Backpropagation is the chain rule", goal: "Trace a loss gradient backwards through a small computation graph.",
		opening: "Backpropagation sounds complicated. Can you connect it to the derivative example we already worked through?",
		concepts: [
			["chain-rule", "The chain rule", "For differentiable scalar functions z = f(w) and L = g(z), dL/dw = (dL/dz) × (dz/dw)."],
			["local-derivatives", "Local derivatives", "The derivative of a composed computation can be assembled from derivatives of its individual operations."],
			["backward-product", "Propagating sensitivity", "For y_hat = w × x + b and squared-error loss, a backward pass multiplies 2 × (y_hat-y) by x to obtain the weight gradient."],
			["fanout", "Adding paths", "When a parameter affects a differentiable loss through multiple computation paths, its total derivative is the sum of the path contributions."],
			["reverse-order", "Reverse traversal", "Reverse-mode differentiation propagates loss sensitivities through a computation graph in reverse dependency order."],
			["reuse", "Reusing intermediate gradients", "Reverse-mode differentiation reuses accumulated intermediate sensitivities instead of independently recalculating each complete path for every parameter."],
		],
		probe: { question: "If w changes z, and z changes L, how do the two local rates combine?", options: ["Multiply", "Always add", "Take the larger rate"], correct: 0, explanation: "Along one path the chain rule multiplies the local derivatives.", thinking: "A unit change is scaled once at each step along the path." },
		predict: { question: "A local derivative is 3 and the incoming loss sensitivity is -2. What passes backwards?", options: ["1", "-6", "6"], correct: 1, explanation: "Multiply the incoming sensitivity by the local derivative: -2 × 3 = -6.", thinking: "The negative sign survives because only one factor is negative." },
		check: { question: "A shared weight receives gradient contributions 2 and -5 from two paths. What is its total gradient?", options: ["-10", "-3", "7"], correct: 1, explanation: "Contributions arriving at a shared parameter add: 2 + (-5) = -3.", thinking: "I multiply along one path, but add when separate paths meet." },
		example: "### Multiply along a path; add at a junction\nWe already found `dL/dw = (dL/dŷ)(dŷ/dw)`. That is a tiny backward pass. For a larger network the same rule is applied repeatedly, starting at the scalar loss. If a value is used twice, the two effects on the loss must both count, so their gradient contributions are added.",
		misconception: "Does backpropagation itself decide the new values of the weights?",
		repair: "Backpropagation calculates gradients. An optimiser then uses those gradients to choose an update. Keeping those jobs separate explains why the same backward pass can feed gradient descent or a different optimiser.",
		transfer: "You can now explain the training loop without a black box: forward pass, compute loss, backpropagate gradients, update parameters, repeat.",
	},
	{
		slug: "generalisation", title: "Training that generalises", goal: "Distinguish learning the training examples from performing well on unseen data.",
		opening: "My training loss keeps falling. How do I know whether the model is learning anything useful?",
		concepts: [
			["training-fit", "Training fit", "Training loss measures error on the examples used to fit the model, rather than directly measuring error on unseen examples."],
			["heldout", "Held-out evaluation", "Evaluation on a held-out sample measures performance on examples that were not used for parameter updates."],
			["overfitting", "Overfitting", "Low training loss alone does not establish low error on unseen data; a model can fit peculiarities of its training examples."],
			["validation", "Validation selection", "A validation set can guide choices such as learning rate, architecture, and the training stopping point."],
			["test-set", "A separate test set", "When validation data guide model choices, a separate untouched test set provides an evaluation that was not used for those choices."],
			["early-stop", "Early stopping", "Selecting an earlier checkpoint using validation performance can avoid retaining later parameter updates that improve training fit while worsening validation performance."],
		],
		probe: { question: "Which examples directly influence the model's gradient updates?", options: ["Training examples", "The untouched test examples", "Only future examples"], correct: 0, explanation: "Parameter updates use the training examples. Held-out data have a different role.", thinking: "The model sees the training labels during optimisation, so a training score is not an independent check." },
		predict: { question: "Training error falls while validation error rises. What is the most useful next step?", options: ["Declare success from training error", "Investigate overfitting and compare earlier checkpoints", "Train on the test set"], correct: 1, explanation: "The growing gap is a reason to investigate generalisation and compare model choices using validation data.", thinking: "Improving the rehearsed examples is different from improving on new ones." },
		check: { question: "Why keep a separate test set after repeatedly tuning on validation results?", options: ["To make gradient updates faster", "To evaluate without reusing the data that guided those choices", "To guarantee zero future errors"], correct: 1, explanation: "Repeated choices depend on validation performance. A separate test set avoids using the same data for selection and final evaluation.", thinking: "If I keep choosing what scores best on one set, that set becomes part of the selection process." },
		example: "### A learning curve tells two stories\nAt checkpoint A, training error is 0.20 and validation error is 0.24. At B they are 0.08 and 0.18. At C they are 0.02 and 0.31. The final checkpoint fits training examples best, but B is the better candidate according to this validation comparison. These are illustrative numbers, not a reported experiment.",
		misconception: "If I choose checkpoint B because it wins on validation, can I call its validation score my final independent result?",
		repair: "The score helped you choose B, so it is part of the selection process. Keep an untouched test set for the final evaluation, and check that the sample and measurement reflect the intended use. No finite held-out score guarantees future performance.",
		transfer: "Optimisation and generalisation answer different questions. The loss and gradients tell us how the model fits its training examples; held-out evaluation checks whether the result transfers.",
	},
	{
		slug: "gradient-descent", title: "Gradient descent: learning from mistakes", goal: "Explain why subtracting a gradient can reduce a loss, and perform one update.",
		opening: "I know what a derivative is, but why do we subtract the gradient? I want to understand the direction, not memorise the formula.",
		concepts: [
			["gradient", "The gradient", "The gradient of a differentiable scalar loss contains its partial derivative with respect to each parameter."],
			["local-change", "A local approximation", "For a differentiable loss, L(w + delta) = L(w) + gradient(L,w) dot delta + o(norm(delta)) as delta approaches zero."],
			["descent-direction", "A descent direction", "For a nonzero gradient and a displacement delta = -eta × gradient, the first-order loss change is -eta × norm(gradient)^2, which is negative for eta > 0."],
			["small-step", "A sufficiently small step", "At a point with nonzero gradient, differentiability implies that sufficiently small steps in the negative-gradient direction reduce the loss."],
			["update", "One gradient update", "The scalar gradient-descent update w_new = w - eta × g gives w_new = 1.8 when w = 1, eta = 0.1 and g = -8."],
			["learning-rate", "The learning rate", "The learning rate scales a gradient step; a step that is too large can increase the loss even when the negative gradient is a local descent direction."],
		],
		probe: { question: "If a function has a negative derivative at the current point, what happens for a sufficiently small positive input change?", options: ["The function decreases", "The function increases", "The derivative says nothing locally"], correct: 0, explanation: "A negative derivative means the function decreases for sufficiently small positive changes around that point.", thinking: "I picture a downhill slope when moving to the right. I am less sure how that becomes an update rule." },
		predict: { question: "Our weight is 1 and its gradient is -8. With learning rate 0.1, which new weight follows gradient descent?", options: ["0.2", "1.8", "-8"], correct: 1, selected: 0, explanation: "The update subtracts the gradient: 1 - 0.1 × (-8) = 1.8. A negative slope calls for increasing the weight locally.", thinking: "My first instinct was to decrease the weight because the gradient was negative. I need to separate the slope from the move." },
		check: { question: "Now w = 1.8, b = 1 and x = 2. The target is 5. What is the new squared error?", options: ["0.16", "4", "8"], correct: 0, explanation: "The new prediction is 1.8 × 2 + 1 = 4.6. The residual is -0.4, whose square is 0.16; the old loss was 4.", thinking: "Increasing the weight moved the prediction toward the target. I can check the direction by recalculating the actual loss." },
		example: "### One update you can check by hand\nReuse our earlier example: `x = 2`, `y = 5`, `b = 1`, and `w = 1`. The prediction is 3, the squared loss is 4, and backpropagation gives a weight gradient of −8. We hold b fixed in this example so that only one parameter changes. Before doing the arithmetic, predict which way w should move.",
		misconception: "I picked 0.2 because I thought a negative gradient meant moving left. Why is that backwards?",
		repair: "The gradient describes how the loss changes as the weight increases. A negative slope means increasing the weight lowers the loss locally. We therefore subtract the negative gradient: `w_new = 1 − 0.1 × (−8) = 1.8`. The prediction becomes 4.6, much closer to the target of 5.\n\nThe local approximation explains this in many dimensions too: choose a change opposite to the gradient, and their dot product is negative. The learning rate controls how far we trust that local picture.",
		transfer: "**The repaired idea:** the gradient describes the slope; the optimiser chooses the move. Subtracting a negative slope moves right.\n\nWe connected the forward pass, squared error, the chain rule, and a gradient update. Try asking next: “What happens if the learning rate is 1 instead of 0.1?”",
	},
];

lessons.push(...disciplineLessons);

/** Premises are jointly used, rather than storing arbitrary topic-similarity edges. */
export const argumentsForGraph: [string[], string][] = [
	[["predictor", "forward"], "prediction"], [["prediction", "features"], "residual"], [["prediction", "residual"], "squared"],
	[["squared"], "loss-slope"], [["predictor"], "weight-sensitivity"], [["loss-slope", "weight-sensitivity", "chain-rule"], "weight-gradient"],
	[["weight-gradient", "prediction", "residual"], "gradient-example"], [["empirical-loss", "chain-rule"], "mean-gradient"],
	[["affine-layer", "predictor"], "composition"], [["composition"], "collapse"], [["relu"], "relu-values"], [["relu-values", "collapse"], "nonlinear"],
	[["chain-rule"], "local-derivatives"], [["weight-gradient", "chain-rule"], "backward-product"],
	[["chain-rule", "fanout"], "reverse-order"], [["reverse-order", "fanout"], "reuse"],
	[["training-fit", "heldout", "empirical-loss"], "overfitting"], [["validation", "heldout"], "test-set"], [["training-fit", "overfitting", "validation"], "early-stop"],
	[["gradient", "local-change"], "descent-direction"], [["local-change", "descent-direction"], "small-step"],
	[["gradient-example", "descent-direction"], "update"], [["local-change", "small-step"], "learning-rate"],
	...disciplineArguments,
];

export const practices = [
	{
		slug: "practice-updates", title: "Practice: one update without a hint", targets: ["weight-gradient", "update", "squared"],
		opening: "Give me a new example so I can check that I understand the update rather than remember the earlier numbers.",
		statement: "A model predicts y_hat = w × x with x = 3, target y = 6, and initial w = 1. The loss is (y_hat-y)^2. Take one gradient-descent step with learning rate 0.05. Find the new weight and compare the old and new losses.",
		solution: "Initially y_hat = 3 and the loss is (3-6)^2 = 9. The gradient is 2 × (3-6) × 3 = -18. The update is w_new = 1 - 0.05 × (-18) = 1.9. The new prediction is 5.7 and the new loss is (5.7-6)^2 = 0.09. The loss fell from 9 to 0.09.",
		thinking: "First I calculate the prediction, then the residual. I need the extra factor of x when differentiating with respect to w. The negative gradient should increase the weight.",
		answer: "The gradient is -18, so the new weight is 1.9. That predicts 5.7 and changes the loss from 9 to 0.09.",
		verdict: "Solved independently. You included the input factor in the gradient, subtracted the negative gradient, and checked the result by recomputing the loss.",
	},
	{
		slug: "practice-generalisation", title: "Practice: spot a misleading training score", targets: ["training-fit", "overfitting", "validation", "test-set"],
		opening: "Let me practise choosing a model from learning curves, without being told which concept to use.",
		statement: "Three checkpoints have (training error, validation error): A = (0.25, 0.28), B = (0.10, 0.16), C = (0.01, 0.30). You must choose one checkpoint, then report its performance. Which checkpoint do you choose, what evidence supports that choice, and what data should you use for the final report?",
		solution: "Choose B because it has the lowest validation error among the candidates. C's better training fit does not imply better performance on held-out examples; its validation error is higher. After selecting B, evaluate it on a separate untouched test set and report that result with the evaluation conditions.",
		thinking: "C looks impressive only on the examples used for training. B has the best validation result. I should avoid presenting the score that I repeatedly used to choose the model as an independent final check.",
		answer: "I choose B using validation error, and evaluate it on a separate test set. C's lower training error alone is not evidence that it will generalise better.",
		verdict: "Solved independently. You used validation for selection, recognised the training/validation gap, and kept a separate test evaluation.",
	},
	...disciplinePractices,
];
