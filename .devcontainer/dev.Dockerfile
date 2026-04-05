FROM storytellerf/android-in-docker:mate-cn-dev-latest

ARG USER_NAME

USER root

COPY --chown=$USER_NAME:$USER_NAME .devcontainer/switch-docker-mirror.sh ./bin/switch-docker-mirror.sh
RUN chmod +x ./bin/switch-docker-mirror.sh
RUN ./bin/switch-docker-mirror.sh $USE_CN_MIRROR

USER $USER_NAME
WORKDIR /home/$USER_NAME

COPY --chown=$USER_NAME:$USER_NAME .devcontainer/custom-entrypoint.sh ./bin/custom-entrypoint.sh
RUN chmod +x ./bin/custom-entrypoint.sh

ENTRYPOINT ["sh", "-c", "$HOME/bin/custom-entrypoint.sh"]
