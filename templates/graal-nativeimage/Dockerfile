# GraalVM docker image used for AoT compilation
FROM oracle/graalvm-ce:1.0.0-rc10 AS build-aot
# Add maven wrapper
ADD mvnw app/
ADD .mvn app/.mvn/
# Add pom
ADD pom.xml app/
# Add sources
ADD src app/src/
# Set working dir
WORKDIR /app
# Build (java side)
RUN ./mvnw package
# Create new image from alpine
FROM frolvlad/alpine-glibc:alpine-3.8
RUN apk add --no-cache ca-certificates
# Copy generated native executable from build-aot
COPY --from=build-aot /app/target/{{lowerCase metadata.main}} /{{metadata.name}}
COPY --from=build-aot /opt/graalvm-ce-1.0.0-rc10/jre/lib/amd64/libsunec.so /libsunec.so
# Set the entrypoint
ENTRYPOINT [ "/{{metadata.name}}" ]
