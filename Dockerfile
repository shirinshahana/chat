
FROM node:argon


# Create app directory
RUN mkdir -p /webchat
RUN mkdir -p /data/db/production
WORKDIR /webchat


# Install app dependencies
COPY package.json /webchat/

RUN npm install

# Bundle app source
COPY . /webchat

EXPOSE 8006 27017
CMD [ "npm", "start" ]
