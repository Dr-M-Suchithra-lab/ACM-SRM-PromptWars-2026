# Key prompts: ShiftSaathi

The six prompts that built ShiftSaathi, in the order the project grew.

**1. The idea and the two sides**
> I want to build something for daily-wage and shift workers in India: masons on building sites, nurses on night
> shifts, college staff, factory workers. Right now everything is on paper registers and WhatsApp. Give me one app
> with two faces: a simple phone app for the worker and a dashboard for the employer. Seed it with one real-looking
> site per sector (a construction site in Chennai, a hospital, a college in Bengaluru, a textile factory in Tiruppur)
> so the demo feels alive from the first click.

**2. Pay that a worker can actually understand**
> Work out the payslip from the shifts, following Indian labour law: overtime after 9 hours a day or 48 hours a
> week, paid at double rate, then PF at 12% of basic and ESI only below the wage ceiling. Every line on the payslip
> should say how it was calculated, like "130.8 h × ₹95 × 2", and there should be a button that reads it aloud.
> Keep each rule a small pure function with its own tests.

**3. Safety reports that can't be ignored**
> When a worker reports a hazard, give it a deadline based on how dangerous it is: 4 hours if it's critical, a day
> if high, three days if medium, a week if low. If the supervisor misses it, move it to the site manager; if it's
> still open at twice the deadline, send it to HR and Safety. Let the worker stay anonymous but still follow their
> own report.

**4. Feedback without fear**
> Workers won't be honest if they think the manager can find out who said what. Store feedback with no worker id at
> all, encrypt the comments, and don't show anything for a site until at least five different people have answered.
> One worker sending five replies must not be enough to unlock it. Prove it with tests.

**5. Just talk to it**
> Many workers can't read a screen comfortably. Add a Talk button that opens a live voice conversation with Gemini
> in whatever language the app is set to: Hindi, Tamil, Telugu, Kannada or English. It should greet the worker by
> name. When they ask about pay or hours, it must call a tool and read the real numbers, never guess. It should be
> able to file a hazard or feedback just from what they say: work out the category and how dangerous it is itself,
> ask only for what's missing, read it back once, and show a confirmation on screen when it's done.

**6. Paying wages**
> Add payroll. The employer picks a month and presses Pay next to a worker, and it goes through PhonePe. The amount
> must come from the payslip on the server, never from the browser. Only mark it paid once PhonePe confirms it, check
> the amount matches, accept the webhook only with the right credentials, and never let a month be paid twice. Show
> the payment date on the worker's payslip.
