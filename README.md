# MC-NET

1. Make sure you have node.js installed ```node --version``` (and do the same for npm, npx)

2. In your working directory: ```npm install mineflayer mineflayer-pathfinder vec3``` This will create package.json and package-lock.json files.

3. Downgrade to a mineflayer compatible version (I used 1.21.1 which is stable I believe 17/09/2024).

3.1. Settings page (tick the last thing there):

![Screenshot from 2025-01-05 14-01-09](https://github.com/user-attachments/assets/82a708dd-34ec-49fa-addc-7f1754653fed)

3.2. Now you can press new install > Find 1.21.1 

![Screenshot from 2025-01-05 14-02-14](https://github.com/user-attachments/assets/e4b1c9d2-5919-4084-b2fe-472eacecae6c)

3.3. Go back to PLAY page and select your new install. 

![Screenshot from 2025-01-05 14-03-03](https://github.com/user-attachments/assets/5ac8180f-e576-486b-90f8-db108742a2c9)

4. Good to go!

---

Go to a singleplayer world with commands. 

Open the "escape" menu. 
Click "Open to LAN" > Make sure to check the port (I just type 12345). 

Copy the JS file (basic NN impelmentation to chop wood)

And make sure to update the constants with you username, follow distance, and port. 

Run: ```node choppy.js``` 


---

Challenges for you:

1. Make the bot eat the apples from trees so it can survive.
2. Change the reward mechanism to be more "survival" perhaps add decay?
3. Add shelter & combat mechanics
4. Make it craft or at least use tools
5. Mining!
6. Create a memory system
7. Change the NN architectures

Happy gaming with your new AI friend!

I created this guide because I saw a lot of videos of "CHATGPT PLAYS MINECRAFT" but under the hood is just interfacing through trial and error using commands instead of an actual state representation.

```  
State: [
  1, # Health
  1, # Food
  13.4, # Oxygen
  0.7, # Height
  0.6153203844230036, # Distance to "logs" large 32 
  0.9558058261758408, # Distance to "logs" short 3
  0.08333333333333333, # Inventory
  0.39829166666666665, # Time
  0, # Exp
  0.4213428747823542 # Buddy system
]
``` 

----

Check out the official mineflayer docs:
[Mineflayer API](https://github.com/PrismarineJS/mineflayer/blob/master/docs/api.md) 





