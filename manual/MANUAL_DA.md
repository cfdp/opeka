Kom i gang
-----------
*De følgende eksempler tager udgangspunkt i vores demo-installation af chatten. Vejledningen kan også bruges til chat-installationer i drift, her udskiftes blot demo.curachat.com med jeres chat-adresse, f.eks. ditdomæne.curachat.com.*

[TOC]
### Koordinatoren logger ind og tænder for chatten

Gå til https://demo.curachat.com/user og log ind med det brugernavn og password du har fået ved at [kontakte CfDP](http://curachat.com#kontakt).

Klik nu på "Start chat" i topmenuen. Dette vil føre dig til chattens startside, hvorfra du kan tænde chatten.

**Sådan tænder og slukker du chatten** 
Ved at klikke “Tænd chat” / “Sluk for chatten” i bunden af skærmen (kun koordinatorer kan gøre dette) gøres eventuelle åbne chatrum tilgængelige for klienter. 

Når chatten slukkes kan klienterne ikke længere tilgå chatten via chat-indgangen. Igangværende chatsessioner vil ikke blive påvirket af at chatten slukkes.

###Rådgiveren logger ind og åbner en 1-til-1 chat

Rådgiveren logger ligesom koordinatoren ind via https://demo.curachat.com/user.

**Opret ny 1-til-1 chat (kø-system ikke aktivt)**

 1. Klik på "Opret nyt chatrum"
 2. Under "Maks. antal deltagere" vælg "2" (dig samt en klient).
 3. Lad "Øverum"-feltet være
 4. Klik "Opret nyt chatrum"

Chatrummet er nu tilgængeligt for klienter via den/de chat-indgange I har aktiveret på jeres hjemmeside.

###Klienten logger på en 1-til-1 chat

Klienten logger typisk på chatten via en chatindgang, implementeret på din / kundens hjemmeside. På CuraChats demo-version kan klienten logge på via https://demo.curachat.com, hvor indgangen kan findes i højre side af skærmen.

Når klienten har klikket på "Chat nu" vil et vindue åbnes, hvor navn / alias, køn og alder kan indtastes.

###Rådgiveren åbner en gruppechat (kø-system ikke aktivt)

En gruppechat åbnes på samme måde som en 1-til-1 chat, bortset fra at du under "Maks. antal deltagere" vælger et andet antal deltagere.

###Rådgiverens moderationsmuligheder (Hvisk, Mute, Kick, Ban,)

**Hvisk**
Se beskrivelse i tabellen ovenfor.

**Mute**
Se beskrivelse i tabellen ovenfor.

**Kick**
Se beskrivelse i tabellen ovenfor.

**Ban**
Det er kun koordinatoren der kan generere den kode, der er nødvendig for at "banne" (udelukke) en bruger. Koordinatoren skal klikke på "Generér ban-kode" og give koden til rådgiveren, som herefter kan "banne" brugeren ved at klikke på brugernavnet og vælge "Ban".


<a name="for-coordinators"></a>
For koordinatorer
-------------------------------

###Administration af chatten
På administrationssiden har koordinatorer og administratorer en række muligheder for at tilpasse chatten og håndtere evt. problemer. Klik på "Chat konfiguration" i topmenuen.
https://demo.curachat.com/admin/opeka

**Tilpasning af velkomstbesked**
Her indstiller du den lille meddelelse, som klienterne ser, når de logger på chatten.

**Genstart af chatten**
Skulle chatten mod forventning løbe ind i tekniske vanskeligheder og har du ikke kunnet få hjælp i supporten, kan du vælge selv at genstarte chatten.

Bemærk at alle brugere vil miste forbindelsen til chatten og blive logget ud af det chatrum, de var i.

To restart the chat, go to “Chat configuration” and press the “Restart server” button at the bottom.

<a name="for-devs-admins"></a>
Udviklere og administratorer
-------------------------

###Chat-indgangen
Chatindgangen som placeres på din / kundens hjemmeside, er en iframe, som indsættes hvor du ønsker det via javascript, som leveres af CfDP.

###Kø-systemet
Kø-systemet kan, ligesom andre avancerede funktioner, aktiveres gennem config.json filen.

Bemærk: selv om kø-funktionen er deaktiveret, har alle 1-til-1 chats stadig en privat kø.

###Link til repository
CuraChat er udviklet under en Open source licens og er tilgængelig på https://github.com/cfdp/opeka. Opeka er projektets oprindelige navn.

*CuraChat manual (DA) v. 1.0*