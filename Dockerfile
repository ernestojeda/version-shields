FROM node:12-alpine

WORKDIR /code

COPY . .

ENTRYPOINT [ "npm" ]

CMD [ "start" ]