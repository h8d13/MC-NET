# MC-NET

1. Make sure you have node.js installed ```node --version``` (and do the same for npm, npx)

2. In your working directory: ```npm install mineflayer mineflayer-pathfinder vec3``` This will create package.json and package-lock.json files.

3. Downgrade your minecraft version to a mineflayer compatible version (I used 1.21.1 which is stable I believe).

3.1. Settings page:

![Screenshot from 2025-01-05 14-01-09](https://github.com/user-attachments/assets/82a708dd-34ec-49fa-addc-7f1754653fed)

3.2. Press new install > Find 1.21.1 

![Screenshot from 2025-01-05 14-02-14](https://github.com/user-attachments/assets/e4b1c9d2-5919-4084-b2fe-472eacecae6c)

3.3. Go back to PLAY page and select your new install. 

![Screenshot from 2025-01-05 14-03-03](https://github.com/user-attachments/assets/5ac8180f-e576-486b-90f8-db108742a2c9)

4. Good to go!

---

Go to a singleplayer world with commands. 
Click "Open to LAN" > Make sure to check the port. 

Copy the JS file (basic NN impelmentation to chop wood)

And make sure to update the constants with you username and desired follow distance. 

Run: ```node choppy.js``` 


---

Challenges for you:

1. Make the bot eat the apples from trees so it can survive.
2. Add shelter & combat mechanics
3. Make it craft or at least use tools
4. Mining!

Happy gaming with your new AI friend!

----

Check out the official mineflayer docs:
[Mineflayer API](https://github.com/PrismarineJS/mineflayer/blob/master/docs/api.md) 





