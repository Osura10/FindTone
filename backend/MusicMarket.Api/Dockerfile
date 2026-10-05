FROM mcr.microsoft.com/dotnet/sdk:8.0 AS build

WORKDIR /src

COPY ["MusicMarket.Api.csproj", "./"]

RUN dotnet restore "MusicMarket.Api.csproj"

COPY . .

RUN dotnet publish "MusicMarket.Api.csproj" -c Release -o /app/publish /p:UseAppHost=false


FROM mcr.microsoft.com/dotnet/aspnet:8.0 AS final

WORKDIR /app

COPY --from=build /app/publish .

ENV ASPNETCORE_URLS=http://+:10000

EXPOSE 10000

ENTRYPOINT ["dotnet", "MusicMarket.Api.dll"]