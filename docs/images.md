# Image Processing
The nature of this game demands real-time low-latency network transfer for a lot of images. Here are some of the tricks and hacks that make the game as responsive as possible.

### Monochromacity
When creating cards you'll easily notice that the canvas only lets you draw in black (on a white background). This has always been the case since version 1, and helps with resulting output `.png` image's built-in compression.

