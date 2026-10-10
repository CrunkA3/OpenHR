# Build-Kontext: Repository-Root (siehe docker-compose.yml)
FROM mcr.microsoft.com/dotnet/sdk:10.0 AS build
WORKDIR /src
COPY OpenHR.Web/OpenHR.Web.csproj OpenHR.Web/
COPY OpenHR.ServiceDefaults/OpenHR.ServiceDefaults.csproj OpenHR.ServiceDefaults/
RUN dotnet restore OpenHR.Web/OpenHR.Web.csproj
COPY OpenHR.Web/ OpenHR.Web/
COPY OpenHR.ServiceDefaults/ OpenHR.ServiceDefaults/
RUN dotnet publish OpenHR.Web/OpenHR.Web.csproj -c Release -o /app/publish --no-restore

FROM mcr.microsoft.com/dotnet/aspnet:10.0 AS final
WORKDIR /app
ENV ASPNETCORE_URLS=http://+:8080
EXPOSE 8080
COPY --from=build /app/publish .
USER $APP_UID
ENTRYPOINT ["dotnet", "OpenHR.Web.dll"]
