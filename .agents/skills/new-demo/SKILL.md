---
name: new-demo
description: Creating a new demo to test the capabilities of the library, and improving the library in the process.
disable-model-invocation: true
---

Here is the brief: I think the library (Uzay) has a decent foundation for me to start using it to create real demos. So I want to start creating interactive demos for real use cases, and also improve the library, see its shortcomings, missing features, the pain points in the API etc. Basically "battle testing" it.

I'm currently making a website to explain math concepts intuitively (not in this repo, it's a separate project) and will make use of these interactive demos extensively. The demos will be inserted inside the content directly in relevant places, as small "embeds" (not really in the web sense, but components inside the content).

I'll give you some specifications for the demo, what it will do, what it should require etc. and you'll try building it. The important thing here is: **while building, keep evaluating the library's capabilities**. Look at what essential features are missing that'll make creating the demo hard or impossible, what things require workarounds or hacks that aren't intended by the library. When encountering those, **don't try to hack around it**. Instead, stop building the demo, identify the issues, come up with solution and fix ideas, and **present them to me before editing anything in the library**.

You can mess around inside the `playground/` repo as much as you want (edit demos, create new demos etc.), but when it comes to editing the actual library code or documentation, you MUST discuss it with me.

There will be a lot of things and issues at first, it's still a very early project. But as we build more and more demos, the library will get better and better, adding new features, fixes, and improvements with each demo we make. Focus on the most important and biggest issues and obstacles relevant to the current demo instead of small nitpick that can get ironed out over time.

Also, most of the demos will be 2D, which is also a new and even more unpolished section of the library. We'll mostly focus on that part, but if something can be improved for both 2D and 3D cases, mention that too.

Our goal isn't to make the demos up and running as quickly as possible, so don't resort to hacks. The goal is to improve the actual library, while demos are just a convenient testing ground for requirements. I repeat: **The library is the main focus, more important than any specific demo we are making**.
