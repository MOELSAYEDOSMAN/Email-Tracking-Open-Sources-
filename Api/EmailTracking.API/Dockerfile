# syntax=docker/dockerfile:1
#
# EmailTracking.API - ASP.NET Core 9 build
#
# Build from the project folder:
#   docker build -t emailtracking-api ./Api/EmailTracking.API
# or let docker compose do it:
#   docker compose up --build

# ------------------------------- build stage --------------------------------
FROM mcr.microsoft.com/dotnet/sdk:9.0 AS build
WORKDIR /src

# Copy the project file on its own first: restore is the slow, cacheable step
# and it only has to rerun when the package references change.
COPY EmailTracking.API.csproj ./
RUN dotnet restore EmailTracking.API.csproj

# Now the rest of the sources.
COPY . ./

RUN dotnet publish EmailTracking.API.csproj \
        --configuration Release \
        --output /app/publish \
        --no-restore \
        /p:UseAppHost=false

# ------------------------------- runtime stage ------------------------------
FROM mcr.microsoft.com/dotnet/aspnet:9.0 AS final
WORKDIR /app

# The .NET 9 base image listens on 8080 by convention.
EXPOSE 8080

ENV ASPNETCORE_URLS=http://+:8080 \
    ASPNETCORE_ENVIRONMENT=Production \
    DOTNET_EnableDiagnostics=0 \
    DOTNET_SYSTEM_GLOBALIZATION_INVARIANT=0

COPY --from=build /app/publish ./

# APP_UID is defined by the base image (non-root "app" user, uid 1654).
USER $APP_UID

ENTRYPOINT ["dotnet", "EmailTracking.API.dll"]
