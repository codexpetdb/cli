# CodexPetDB CLI

[English](README.md) | [简体中文](README.zh-CN.md) |
[Changelog](CHANGELOG.md)

The `codexpetdb` npm package provides the `petdb` command and the equivalent
`codexpetdb` alias for discovering, installing, submitting, and editing
verified Codex pets. The database and Web application are private; this CLI is
maintained publicly for community review.

## Showcase

<p align="center">
  <a href="https://codexpetdb.com/en"><img src="https://cdn.codexpetdb.com/images/site/icons/favicon-0eb461f3.webp" width="32" height="32" alt="CodexPetDB favicon"></a><br>
  <a href="https://codexpetdb.com/en"><strong>CodexPetDB (Visit the website for more)</strong></a><br>
  <a href="https://codexpetdb.com/en/submit">Submit</a> · <a href="https://codexpetdb.com/en/requests">Request a pet</a>
</p>

<table>
  <tbody>
    <tr>
      <td align="center" width="25%">
        <a href="https://codexpetdb.com/en/pets/a-tom"><img src="https://cdn.codexpetdb.com/revisions/019f83b6-2d6d-75fd-9369-3f9f24bdb861/poster.webp" width="128" alt="A Tom Codex pet preview"></a><br>
        <a href="https://codexpetdb.com/en/pets/a-tom"><strong>A Tom</strong></a><br>
        <code>npx codexpetdb install &#39;a-tom&#39;</code><br>
        <a href="https://codexpetdb.com/en/pets/a-tom#install-a-tom"><kbd>npm install</kbd></a>
        <a href="https://codexpetdb.com/en/pets/a-tom#install-a-tom"><kbd>Install in Codex</kbd></a>
      </td>
      <td align="center" width="25%">
        <a href="https://codexpetdb.com/en/pets/acetafy"><img src="https://cdn.codexpetdb.com/revisions/019f88f6-1c3a-7778-ae93-4d999a4ee395/poster.webp" width="128" alt="Acetafy Codex pet preview"></a><br>
        <a href="https://codexpetdb.com/en/pets/acetafy"><strong>Acetafy</strong></a><br>
        <code>npx codexpetdb install &#39;acetafy&#39;</code><br>
        <a href="https://codexpetdb.com/en/pets/acetafy#install-acetafy"><kbd>npm install</kbd></a>
        <a href="https://codexpetdb.com/en/pets/acetafy#install-acetafy"><kbd>Install in Codex</kbd></a>
      </td>
      <td align="center" width="25%">
        <a href="https://codexpetdb.com/en/pets/ada-lovelace"><img src="https://cdn.codexpetdb.com/revisions/019f96ed-46be-755d-a1f7-7c81a8867536/poster.webp" width="128" alt="Ada Lovelace Codex pet preview"></a><br>
        <a href="https://codexpetdb.com/en/pets/ada-lovelace"><strong>Ada Lovelace</strong></a><br>
        <code>npx codexpetdb install &#39;ada-lovelace&#39;</code><br>
        <a href="https://codexpetdb.com/en/pets/ada-lovelace#install-ada-lovelace"><kbd>npm install</kbd></a>
        <a href="https://codexpetdb.com/en/pets/ada-lovelace#install-ada-lovelace"><kbd>Install in Codex</kbd></a>
      </td>
      <td align="center" width="25%">
        <a href="https://codexpetdb.com/en/pets/afu-duo"><img src="https://cdn.codexpetdb.com/revisions/019f88f6-c0f7-73dd-935f-3912f3c29933/poster.webp" width="128" alt="Afu Duo Codex pet preview"></a><br>
        <a href="https://codexpetdb.com/en/pets/afu-duo"><strong>Afu Duo</strong></a><br>
        <code>npx codexpetdb install &#39;afu-duo&#39;</code><br>
        <a href="https://codexpetdb.com/en/pets/afu-duo#install-afu-duo"><kbd>npm install</kbd></a>
        <a href="https://codexpetdb.com/en/pets/afu-duo#install-afu-duo"><kbd>Install in Codex</kbd></a>
      </td>
    </tr>
    <tr>
      <td align="center" width="25%">
        <a href="https://codexpetdb.com/en/pets/ai-2"><img src="https://cdn.codexpetdb.com/revisions/019f842a-265a-75cb-9c3f-a341aa9cfd90/poster.webp" width="128" alt="Ai 2 Codex pet preview"></a><br>
        <a href="https://codexpetdb.com/en/pets/ai-2"><strong>Ai 2</strong></a><br>
        <code>npx codexpetdb install &#39;ai-2&#39;</code><br>
        <a href="https://codexpetdb.com/en/pets/ai-2#install-ai-2"><kbd>npm install</kbd></a>
        <a href="https://codexpetdb.com/en/pets/ai-2#install-ai-2"><kbd>Install in Codex</kbd></a>
      </td>
      <td align="center" width="25%">
        <a href="https://codexpetdb.com/en/pets/aka-shiba"><img src="https://cdn.codexpetdb.com/revisions/019f88f7-8e5e-766c-9f31-250c7882a001/poster.webp" width="128" alt="Aka Shiba Codex pet preview"></a><br>
        <a href="https://codexpetdb.com/en/pets/aka-shiba"><strong>Aka Shiba</strong></a><br>
        <code>npx codexpetdb install &#39;aka-shiba&#39;</code><br>
        <a href="https://codexpetdb.com/en/pets/aka-shiba#install-aka-shiba"><kbd>npm install</kbd></a>
        <a href="https://codexpetdb.com/en/pets/aka-shiba#install-aka-shiba"><kbd>Install in Codex</kbd></a>
      </td>
      <td align="center" width="25%">
        <a href="https://codexpetdb.com/en/pets/angry-cat"><img src="https://cdn.codexpetdb.com/revisions/019f8449-e452-7263-b1fb-0f7373572ea2/poster.webp" width="128" alt="Angry Cat Codex pet preview"></a><br>
        <a href="https://codexpetdb.com/en/pets/angry-cat"><strong>Angry Cat</strong></a><br>
        <code>npx codexpetdb install &#39;angry-cat&#39;</code><br>
        <a href="https://codexpetdb.com/en/pets/angry-cat#install-angry-cat"><kbd>npm install</kbd></a>
        <a href="https://codexpetdb.com/en/pets/angry-cat#install-angry-cat"><kbd>Install in Codex</kbd></a>
      </td>
      <td align="center" width="25%">
        <a href="https://codexpetdb.com/en/pets/anon-nailong"><img src="https://cdn.codexpetdb.com/revisions/019f8431-7033-705a-9985-5da5158c0f1b/poster.webp" width="128" alt="Anon Nailong Codex pet preview"></a><br>
        <a href="https://codexpetdb.com/en/pets/anon-nailong"><strong>Anon Nailong</strong></a><br>
        <code>npx codexpetdb install &#39;anon-nailong&#39;</code><br>
        <a href="https://codexpetdb.com/en/pets/anon-nailong#install-anon-nailong"><kbd>npm install</kbd></a>
        <a href="https://codexpetdb.com/en/pets/anon-nailong#install-anon-nailong"><kbd>Install in Codex</kbd></a>
      </td>
    </tr>
    <tr>
      <td align="center" width="25%">
        <a href="https://codexpetdb.com/en/pets/anya"><img src="https://cdn.codexpetdb.com/revisions/019f8432-8cac-71f8-9223-168016d09fd4/poster.webp" width="128" alt="Anya Codex pet preview"></a><br>
        <a href="https://codexpetdb.com/en/pets/anya"><strong>Anya</strong></a><br>
        <code>npx codexpetdb install &#39;anya&#39;</code><br>
        <a href="https://codexpetdb.com/en/pets/anya#install-anya"><kbd>npm install</kbd></a>
        <a href="https://codexpetdb.com/en/pets/anya#install-anya"><kbd>Install in Codex</kbd></a>
      </td>
      <td align="center" width="25%">
        <a href="https://codexpetdb.com/en/pets/anya-2"><img src="https://cdn.codexpetdb.com/revisions/019f88f8-7489-7638-9df2-535d587ec365/poster.webp" width="128" alt="Anya 2 Codex pet preview"></a><br>
        <a href="https://codexpetdb.com/en/pets/anya-2"><strong>Anya 2</strong></a><br>
        <code>npx codexpetdb install &#39;anya-2&#39;</code><br>
        <a href="https://codexpetdb.com/en/pets/anya-2#install-anya-2"><kbd>npm install</kbd></a>
        <a href="https://codexpetdb.com/en/pets/anya-2#install-anya-2"><kbd>Install in Codex</kbd></a>
      </td>
      <td align="center" width="25%">
        <a href="https://codexpetdb.com/en/pets/anya-3"><img src="https://cdn.codexpetdb.com/revisions/019f88f8-bb80-72aa-9635-09e9ed0e9e53/poster.webp" width="128" alt="Anya 3 Codex pet preview"></a><br>
        <a href="https://codexpetdb.com/en/pets/anya-3"><strong>Anya 3</strong></a><br>
        <code>npx codexpetdb install &#39;anya-3&#39;</code><br>
        <a href="https://codexpetdb.com/en/pets/anya-3#install-anya-3"><kbd>npm install</kbd></a>
        <a href="https://codexpetdb.com/en/pets/anya-3#install-anya-3"><kbd>Install in Codex</kbd></a>
      </td>
      <td align="center" width="25%">
        <a href="https://codexpetdb.com/en/pets/aoi"><img src="https://cdn.codexpetdb.com/revisions/019f87c8-1f67-76a1-9353-1653be15a5ec/poster.webp" width="128" alt="Aoi Codex pet preview"></a><br>
        <a href="https://codexpetdb.com/en/pets/aoi"><strong>Aoi</strong></a><br>
        <code>npx codexpetdb install &#39;aoi&#39;</code><br>
        <a href="https://codexpetdb.com/en/pets/aoi#install-aoi"><kbd>npm install</kbd></a>
        <a href="https://codexpetdb.com/en/pets/aoi#install-aoi"><kbd>Install in Codex</kbd></a>
      </td>
    </tr>
    <tr>
      <td align="center" width="25%">
        <a href="https://codexpetdb.com/en/pets/ape-escape"><img src="https://cdn.codexpetdb.com/revisions/019f87c8-6a8b-75aa-8287-ac4f508d58d5/poster.webp" width="128" alt="Ape Escape Codex pet preview"></a><br>
        <a href="https://codexpetdb.com/en/pets/ape-escape"><strong>Ape Escape</strong></a><br>
        <code>npx codexpetdb install &#39;ape-escape&#39;</code><br>
        <a href="https://codexpetdb.com/en/pets/ape-escape#install-ape-escape"><kbd>npm install</kbd></a>
        <a href="https://codexpetdb.com/en/pets/ape-escape#install-ape-escape"><kbd>Install in Codex</kbd></a>
      </td>
      <td align="center" width="25%">
        <a href="https://codexpetdb.com/en/pets/apupepe"><img src="https://cdn.codexpetdb.com/revisions/019f87c8-af47-747d-b472-f050c2e160f9/poster.webp" width="128" alt="Apupepe Codex pet preview"></a><br>
        <a href="https://codexpetdb.com/en/pets/apupepe"><strong>Apupepe</strong></a><br>
        <code>npx codexpetdb install &#39;apupepe&#39;</code><br>
        <a href="https://codexpetdb.com/en/pets/apupepe#install-apupepe"><kbd>npm install</kbd></a>
        <a href="https://codexpetdb.com/en/pets/apupepe#install-apupepe"><kbd>Install in Codex</kbd></a>
      </td>
      <td align="center" width="25%">
        <a href="https://codexpetdb.com/en/pets/asterix"><img src="https://cdn.codexpetdb.com/revisions/019f87c8-fff8-7069-bf0a-2b1d14dce9d3/poster.webp" width="128" alt="Asterix Codex pet preview"></a><br>
        <a href="https://codexpetdb.com/en/pets/asterix"><strong>Asterix</strong></a><br>
        <code>npx codexpetdb install &#39;asterix&#39;</code><br>
        <a href="https://codexpetdb.com/en/pets/asterix#install-asterix"><kbd>npm install</kbd></a>
        <a href="https://codexpetdb.com/en/pets/asterix#install-asterix"><kbd>Install in Codex</kbd></a>
      </td>
      <td align="center" width="25%">
        <a href="https://codexpetdb.com/en/pets/aurelion-sol-2"><img src="https://cdn.codexpetdb.com/revisions/019f88f9-bc35-70cd-9f3d-db2dd73deb0f/poster.webp" width="128" alt="Aurelion Sol 2 Codex pet preview"></a><br>
        <a href="https://codexpetdb.com/en/pets/aurelion-sol-2"><strong>Aurelion Sol 2</strong></a><br>
        <code>npx codexpetdb install &#39;aurelion-sol-2&#39;</code><br>
        <a href="https://codexpetdb.com/en/pets/aurelion-sol-2#install-aurelion-sol-2"><kbd>npm install</kbd></a>
        <a href="https://codexpetdb.com/en/pets/aurelion-sol-2#install-aurelion-sol-2"><kbd>Install in Codex</kbd></a>
      </td>
    </tr>
    <tr>
      <td align="center" width="25%">
        <a href="https://codexpetdb.com/en/pets/ayaka"><img src="https://cdn.codexpetdb.com/revisions/019f87ca-081c-7398-89c3-abd350508d04/poster.webp" width="128" alt="Ayaka Codex pet preview"></a><br>
        <a href="https://codexpetdb.com/en/pets/ayaka"><strong>Ayaka</strong></a><br>
        <code>npx codexpetdb install &#39;ayaka&#39;</code><br>
        <a href="https://codexpetdb.com/en/pets/ayaka#install-ayaka"><kbd>npm install</kbd></a>
        <a href="https://codexpetdb.com/en/pets/ayaka#install-ayaka"><kbd>Install in Codex</kbd></a>
      </td>
      <td align="center" width="25%">
        <a href="https://codexpetdb.com/en/pets/banana-grin"><img src="https://cdn.codexpetdb.com/revisions/019f87ca-5cf1-7594-86eb-78d187bd8aef/poster.webp" width="128" alt="Banana Grin Codex pet preview"></a><br>
        <a href="https://codexpetdb.com/en/pets/banana-grin"><strong>Banana Grin</strong></a><br>
        <code>npx codexpetdb install &#39;banana-grin&#39;</code><br>
        <a href="https://codexpetdb.com/en/pets/banana-grin#install-banana-grin"><kbd>npm install</kbd></a>
        <a href="https://codexpetdb.com/en/pets/banana-grin#install-banana-grin"><kbd>Install in Codex</kbd></a>
      </td>
      <td align="center" width="25%">
        <a href="https://codexpetdb.com/en/pets/bananacat"><img src="https://cdn.codexpetdb.com/revisions/019f87ca-aa82-75ab-9eb1-f35e6df4e982/poster.webp" width="128" alt="Bananacat Codex pet preview"></a><br>
        <a href="https://codexpetdb.com/en/pets/bananacat"><strong>Bananacat</strong></a><br>
        <code>npx codexpetdb install &#39;bananacat&#39;</code><br>
        <a href="https://codexpetdb.com/en/pets/bananacat#install-bananacat"><kbd>npm install</kbd></a>
        <a href="https://codexpetdb.com/en/pets/bananacat#install-bananacat"><kbd>Install in Codex</kbd></a>
      </td>
      <td align="center" width="25%">
        <a href="https://codexpetdb.com/en/pets/baobao-2"><img src="https://cdn.codexpetdb.com/revisions/019f87cb-0078-7769-9584-61f9fe0ba8f6/poster.webp" width="128" alt="Baobao 2 Codex pet preview"></a><br>
        <a href="https://codexpetdb.com/en/pets/baobao-2"><strong>Baobao 2</strong></a><br>
        <code>npx codexpetdb install &#39;baobao-2&#39;</code><br>
        <a href="https://codexpetdb.com/en/pets/baobao-2#install-baobao-2"><kbd>npm install</kbd></a>
        <a href="https://codexpetdb.com/en/pets/baobao-2#install-baobao-2"><kbd>Install in Codex</kbd></a>
      </td>
    </tr>
    <tr>
      <td align="center" width="25%">
        <a href="https://codexpetdb.com/en/pets/bears-cheolwoongi"><img src="https://cdn.codexpetdb.com/revisions/019f87cb-b237-70e4-9e59-a163f0f1f65c/poster.webp" width="128" alt="Bears Cheolwoongi Codex pet preview"></a><br>
        <a href="https://codexpetdb.com/en/pets/bears-cheolwoongi"><strong>Bears Cheolwoongi</strong></a><br>
        <code>npx codexpetdb install &#39;bears-cheolwoongi&#39;</code><br>
        <a href="https://codexpetdb.com/en/pets/bears-cheolwoongi#install-bears-cheolwoongi"><kbd>npm install</kbd></a>
        <a href="https://codexpetdb.com/en/pets/bears-cheolwoongi#install-bears-cheolwoongi"><kbd>Install in Codex</kbd></a>
      </td>
      <td align="center" width="25%">
        <a href="https://codexpetdb.com/en/pets/bee-teemo"><img src="https://cdn.codexpetdb.com/revisions/019f87cb-fb4a-739c-8f0f-bae3c5ffbfb2/poster.webp" width="128" alt="Bee Teemo Codex pet preview"></a><br>
        <a href="https://codexpetdb.com/en/pets/bee-teemo"><strong>Bee Teemo</strong></a><br>
        <code>npx codexpetdb install &#39;bee-teemo&#39;</code><br>
        <a href="https://codexpetdb.com/en/pets/bee-teemo#install-bee-teemo"><kbd>npm install</kbd></a>
        <a href="https://codexpetdb.com/en/pets/bee-teemo#install-bee-teemo"><kbd>Install in Codex</kbd></a>
      </td>
      <td align="center" width="25%">
        <a href="https://codexpetdb.com/en/pets/beerus"><img src="https://cdn.codexpetdb.com/revisions/019f87cc-418c-74c8-9018-7f0cb355c26f/poster.webp" width="128" alt="Beerus Codex pet preview"></a><br>
        <a href="https://codexpetdb.com/en/pets/beerus"><strong>Beerus</strong></a><br>
        <code>npx codexpetdb install &#39;beerus&#39;</code><br>
        <a href="https://codexpetdb.com/en/pets/beerus#install-beerus"><kbd>npm install</kbd></a>
        <a href="https://codexpetdb.com/en/pets/beerus#install-beerus"><kbd>Install in Codex</kbd></a>
      </td>
      <td align="center" width="25%">
        <a href="https://codexpetdb.com/en/pets/bellylaugh"><img src="https://cdn.codexpetdb.com/revisions/019f87cc-93d1-7294-bbea-4fac24601baa/poster.webp" width="128" alt="Bellylaugh Codex pet preview"></a><br>
        <a href="https://codexpetdb.com/en/pets/bellylaugh"><strong>Bellylaugh</strong></a><br>
        <code>npx codexpetdb install &#39;bellylaugh&#39;</code><br>
        <a href="https://codexpetdb.com/en/pets/bellylaugh#install-bellylaugh"><kbd>npm install</kbd></a>
        <a href="https://codexpetdb.com/en/pets/bellylaugh#install-bellylaugh"><kbd>Install in Codex</kbd></a>
      </td>
    </tr>
    <tr>
      <td align="center" width="25%">
        <a href="https://codexpetdb.com/en/pets/boba-2"><img src="https://cdn.codexpetdb.com/revisions/019f87d4-40ce-74c9-84ab-fc011fbb2f6b/poster.webp" width="128" alt="Boba 2 Codex pet preview"></a><br>
        <a href="https://codexpetdb.com/en/pets/boba-2"><strong>Boba 2</strong></a><br>
        <code>npx codexpetdb install &#39;boba-2&#39;</code><br>
        <a href="https://codexpetdb.com/en/pets/boba-2#install-boba-2"><kbd>npm install</kbd></a>
        <a href="https://codexpetdb.com/en/pets/boba-2#install-boba-2"><kbd>Install in Codex</kbd></a>
      </td>
      <td align="center" width="25%">
        <a href="https://codexpetdb.com/en/pets/bocchi-guitar"><img src="https://cdn.codexpetdb.com/revisions/019f87d4-b37d-7137-bb47-620dc1a60b46/poster.webp" width="128" alt="Bocchi Guitar Codex pet preview"></a><br>
        <a href="https://codexpetdb.com/en/pets/bocchi-guitar"><strong>Bocchi Guitar</strong></a><br>
        <code>npx codexpetdb install &#39;bocchi-guitar&#39;</code><br>
        <a href="https://codexpetdb.com/en/pets/bocchi-guitar#install-bocchi-guitar"><kbd>npm install</kbd></a>
        <a href="https://codexpetdb.com/en/pets/bocchi-guitar#install-bocchi-guitar"><kbd>Install in Codex</kbd></a>
      </td>
      <td align="center" width="25%">
        <a href="https://codexpetdb.com/en/pets/bonzibuddy"><img src="https://cdn.codexpetdb.com/revisions/019f87d4-fd68-7228-9e05-6fada3c7e9b3/poster.webp" width="128" alt="Bonzibuddy Codex pet preview"></a><br>
        <a href="https://codexpetdb.com/en/pets/bonzibuddy"><strong>Bonzibuddy</strong></a><br>
        <code>npx codexpetdb install &#39;bonzibuddy&#39;</code><br>
        <a href="https://codexpetdb.com/en/pets/bonzibuddy#install-bonzibuddy"><kbd>npm install</kbd></a>
        <a href="https://codexpetdb.com/en/pets/bonzibuddy#install-bonzibuddy"><kbd>Install in Codex</kbd></a>
      </td>
      <td align="center" width="25%">
        <a href="https://codexpetdb.com/en/pets/buff-patrick"><img src="https://cdn.codexpetdb.com/revisions/019f87d5-575e-76cc-b23e-4d2eaa507fb1/poster.webp" width="128" alt="Buff Patrick Codex pet preview"></a><br>
        <a href="https://codexpetdb.com/en/pets/buff-patrick"><strong>Buff Patrick</strong></a><br>
        <code>npx codexpetdb install &#39;buff-patrick&#39;</code><br>
        <a href="https://codexpetdb.com/en/pets/buff-patrick#install-buff-patrick"><kbd>npm install</kbd></a>
        <a href="https://codexpetdb.com/en/pets/buff-patrick#install-buff-patrick"><kbd>Install in Codex</kbd></a>
      </td>
    </tr>
    <tr>
      <td align="center" width="25%">
        <a href="https://codexpetdb.com/en/pets/buge"><img src="https://cdn.codexpetdb.com/revisions/019f87d5-fe48-76f4-a002-b9ed46f337dc/poster.webp" width="128" alt="Buge Codex pet preview"></a><br>
        <a href="https://codexpetdb.com/en/pets/buge"><strong>Buge</strong></a><br>
        <code>npx codexpetdb install &#39;buge&#39;</code><br>
        <a href="https://codexpetdb.com/en/pets/buge#install-buge"><kbd>npm install</kbd></a>
        <a href="https://codexpetdb.com/en/pets/buge#install-buge"><kbd>Install in Codex</kbd></a>
      </td>
      <td align="center" width="25%">
        <a href="https://codexpetdb.com/en/pets/byte-bunny"><img src="https://cdn.codexpetdb.com/revisions/019f96f2-64be-77a6-97a1-9bd229eb759e/poster.webp" width="128" alt="Byte Bunny Codex pet preview"></a><br>
        <a href="https://codexpetdb.com/en/pets/byte-bunny"><strong>Byte Bunny</strong></a><br>
        <code>npx codexpetdb install &#39;byte-bunny&#39;</code><br>
        <a href="https://codexpetdb.com/en/pets/byte-bunny#install-byte-bunny"><kbd>npm install</kbd></a>
        <a href="https://codexpetdb.com/en/pets/byte-bunny#install-byte-bunny"><kbd>Install in Codex</kbd></a>
      </td>
      <td align="center" width="25%">
        <a href="https://codexpetdb.com/en/pets/calico"><img src="https://cdn.codexpetdb.com/revisions/019f96f4-4587-77af-983c-adff41c48f2f/poster.webp" width="128" alt="Calico Codex pet preview"></a><br>
        <a href="https://codexpetdb.com/en/pets/calico"><strong>Calico</strong></a><br>
        <code>npx codexpetdb install &#39;calico&#39;</code><br>
        <a href="https://codexpetdb.com/en/pets/calico#install-calico"><kbd>npm install</kbd></a>
        <a href="https://codexpetdb.com/en/pets/calico#install-calico"><kbd>Install in Codex</kbd></a>
      </td>
      <td align="center" width="25%">
        <a href="https://codexpetdb.com/en/pets/capoo"><img src="https://cdn.codexpetdb.com/revisions/019f96f4-b504-709e-b01c-504f7c2d8979/poster.webp" width="128" alt="Capoo Codex pet preview"></a><br>
        <a href="https://codexpetdb.com/en/pets/capoo"><strong>Capoo</strong></a><br>
        <code>npx codexpetdb install &#39;capoo&#39;</code><br>
        <a href="https://codexpetdb.com/en/pets/capoo#install-capoo"><kbd>npm install</kbd></a>
        <a href="https://codexpetdb.com/en/pets/capoo#install-capoo"><kbd>Install in Codex</kbd></a>
      </td>
    </tr>
    <tr>
      <td align="center" width="25%">
        <a href="https://codexpetdb.com/en/pets/capy"><img src="https://cdn.codexpetdb.com/revisions/019f96f5-e582-73ce-affa-a8bc5c53f4ad/poster.webp" width="128" alt="Capy Codex pet preview"></a><br>
        <a href="https://codexpetdb.com/en/pets/capy"><strong>Capy</strong></a><br>
        <code>npx codexpetdb install &#39;capy&#39;</code><br>
        <a href="https://codexpetdb.com/en/pets/capy#install-capy"><kbd>npm install</kbd></a>
        <a href="https://codexpetdb.com/en/pets/capy#install-capy"><kbd>Install in Codex</kbd></a>
      </td>
      <td align="center" width="25%">
        <a href="https://codexpetdb.com/en/pets/capybaralulu"><img src="https://cdn.codexpetdb.com/revisions/019f96f6-3d3d-7284-9e15-5e358c853b2e/poster.webp" width="128" alt="Capybaralulu Codex pet preview"></a><br>
        <a href="https://codexpetdb.com/en/pets/capybaralulu"><strong>Capybaralulu</strong></a><br>
        <code>npx codexpetdb install &#39;capybaralulu&#39;</code><br>
        <a href="https://codexpetdb.com/en/pets/capybaralulu#install-capybaralulu"><kbd>npm install</kbd></a>
        <a href="https://codexpetdb.com/en/pets/capybaralulu#install-capybaralulu"><kbd>Install in Codex</kbd></a>
      </td>
      <td align="center" width="25%">
        <a href="https://codexpetdb.com/en/pets/cat-77"><img src="https://cdn.codexpetdb.com/revisions/019f96fe-49cb-729c-b55d-cdd61bf8a477/poster.webp" width="128" alt="77 Codex pet preview"></a><br>
        <a href="https://codexpetdb.com/en/pets/cat-77"><strong>77</strong></a><br>
        <code>npx codexpetdb install &#39;cat-77&#39;</code><br>
        <a href="https://codexpetdb.com/en/pets/cat-77#install-cat-77"><kbd>npm install</kbd></a>
        <a href="https://codexpetdb.com/en/pets/cat-77#install-cat-77"><kbd>Install in Codex</kbd></a>
      </td>
      <td align="center" width="25%">
        <a href="https://codexpetdb.com/en/pets/charmander"><img src="https://cdn.codexpetdb.com/revisions/019f9702-665d-713f-ba49-b37409ea63b9/poster.webp" width="128" alt="Charmander Codex pet preview"></a><br>
        <a href="https://codexpetdb.com/en/pets/charmander"><strong>Charmander</strong></a><br>
        <code>npx codexpetdb install &#39;charmander&#39;</code><br>
        <a href="https://codexpetdb.com/en/pets/charmander#install-charmander"><kbd>npm install</kbd></a>
        <a href="https://codexpetdb.com/en/pets/charmander#install-charmander"><kbd>Install in Codex</kbd></a>
      </td>
    </tr>
    <tr>
      <td align="center" width="25%">
        <a href="https://codexpetdb.com/en/pets/chiikawa"><img src="https://cdn.codexpetdb.com/revisions/019f9703-334b-767f-b040-a4bbd7cb00a2/poster.webp" width="128" alt="Chiikawa Codex pet preview"></a><br>
        <a href="https://codexpetdb.com/en/pets/chiikawa"><strong>Chiikawa</strong></a><br>
        <code>npx codexpetdb install &#39;chiikawa&#39;</code><br>
        <a href="https://codexpetdb.com/en/pets/chiikawa#install-chiikawa"><kbd>npm install</kbd></a>
        <a href="https://codexpetdb.com/en/pets/chiikawa#install-chiikawa"><kbd>Install in Codex</kbd></a>
      </td>
      <td align="center" width="25%">
        <a href="https://codexpetdb.com/en/pets/chopper"><img src="https://cdn.codexpetdb.com/revisions/019f9704-17d1-7488-8549-ec3655df29bd/poster.webp" width="128" alt="Chopper Codex pet preview"></a><br>
        <a href="https://codexpetdb.com/en/pets/chopper"><strong>Chopper</strong></a><br>
        <code>npx codexpetdb install &#39;chopper&#39;</code><br>
        <a href="https://codexpetdb.com/en/pets/chopper#install-chopper"><kbd>npm install</kbd></a>
        <a href="https://codexpetdb.com/en/pets/chopper#install-chopper"><kbd>Install in Codex</kbd></a>
      </td>
      <td align="center" width="25%">
        <a href="https://codexpetdb.com/en/pets/chopper-2"><img src="https://cdn.codexpetdb.com/revisions/019f9704-6b07-703d-9981-afcb7d227033/poster.webp" width="128" alt="Chopper 2 Codex pet preview"></a><br>
        <a href="https://codexpetdb.com/en/pets/chopper-2"><strong>Chopper 2</strong></a><br>
        <code>npx codexpetdb install &#39;chopper-2&#39;</code><br>
        <a href="https://codexpetdb.com/en/pets/chopper-2#install-chopper-2"><kbd>npm install</kbd></a>
        <a href="https://codexpetdb.com/en/pets/chopper-2#install-chopper-2"><kbd>Install in Codex</kbd></a>
      </td>
      <td align="center" width="25%">
        <a href="https://codexpetdb.com/en/pets/cinder"><img src="https://cdn.codexpetdb.com/revisions/019f9704-c75c-708c-a61b-099736335066/poster.webp" width="128" alt="Cinder Codex pet preview"></a><br>
        <a href="https://codexpetdb.com/en/pets/cinder"><strong>Cinder</strong></a><br>
        <code>npx codexpetdb install &#39;cinder&#39;</code><br>
        <a href="https://codexpetdb.com/en/pets/cinder#install-cinder"><kbd>npm install</kbd></a>
        <a href="https://codexpetdb.com/en/pets/cinder#install-cinder"><kbd>Install in Codex</kbd></a>
      </td>
    </tr>
    <tr>
      <td align="center" width="25%">
        <a href="https://codexpetdb.com/en/pets/cinnamonroll"><img src="https://cdn.codexpetdb.com/revisions/019f9705-235b-75d5-ad2f-02b3295c90a3/poster.webp" width="128" alt="Cinnamonroll Codex pet preview"></a><br>
        <a href="https://codexpetdb.com/en/pets/cinnamonroll"><strong>Cinnamonroll</strong></a><br>
        <code>npx codexpetdb install &#39;cinnamonroll&#39;</code><br>
        <a href="https://codexpetdb.com/en/pets/cinnamonroll#install-cinnamonroll"><kbd>npm install</kbd></a>
        <a href="https://codexpetdb.com/en/pets/cinnamonroll#install-cinnamonroll"><kbd>Install in Codex</kbd></a>
      </td>
      <td align="center" width="25%">
        <a href="https://codexpetdb.com/en/pets/clippy-3"><img src="https://cdn.codexpetdb.com/revisions/019f972b-88e2-760f-8860-7318d1bd30eb/poster.webp" width="128" alt="Clippy 3 Codex pet preview"></a><br>
        <a href="https://codexpetdb.com/en/pets/clippy-3"><strong>Clippy 3</strong></a><br>
        <code>npx codexpetdb install &#39;clippy-3&#39;</code><br>
        <a href="https://codexpetdb.com/en/pets/clippy-3#install-clippy-3"><kbd>npm install</kbd></a>
        <a href="https://codexpetdb.com/en/pets/clippy-3#install-clippy-3"><kbd>Install in Codex</kbd></a>
      </td>
      <td align="center" width="25%">
        <a href="https://codexpetdb.com/en/pets/cockroach"><img src="https://cdn.codexpetdb.com/revisions/019f83b6-92a9-746f-bf48-eec602564d0c/poster.webp" width="128" alt="Cockroach Codex pet preview"></a><br>
        <a href="https://codexpetdb.com/en/pets/cockroach"><strong>Cockroach</strong></a><br>
        <code>npx codexpetdb install &#39;cockroach&#39;</code><br>
        <a href="https://codexpetdb.com/en/pets/cockroach#install-cockroach"><kbd>npm install</kbd></a>
        <a href="https://codexpetdb.com/en/pets/cockroach#install-cockroach"><kbd>Install in Codex</kbd></a>
      </td>
      <td align="center" width="25%">
        <a href="https://codexpetdb.com/en/pets/corgi-cool"><img src="https://cdn.codexpetdb.com/revisions/019f97a2-e0ce-74ef-a465-f4cce76051e3/poster.webp" width="128" alt="Corgi Cool Codex pet preview"></a><br>
        <a href="https://codexpetdb.com/en/pets/corgi-cool"><strong>Corgi Cool</strong></a><br>
        <code>npx codexpetdb install &#39;corgi-cool&#39;</code><br>
        <a href="https://codexpetdb.com/en/pets/corgi-cool#install-corgi-cool"><kbd>npm install</kbd></a>
        <a href="https://codexpetdb.com/en/pets/corgi-cool#install-corgi-cool"><kbd>Install in Codex</kbd></a>
      </td>
    </tr>
    <tr>
      <td align="center" width="25%">
        <a href="https://codexpetdb.com/en/pets/corsair-cat"><img src="https://cdn.codexpetdb.com/revisions/019f97a3-13d2-7571-a817-00b803d1bcf1/poster.webp" width="128" alt="Corsair Cat Codex pet preview"></a><br>
        <a href="https://codexpetdb.com/en/pets/corsair-cat"><strong>Corsair Cat</strong></a><br>
        <code>npx codexpetdb install &#39;corsair-cat&#39;</code><br>
        <a href="https://codexpetdb.com/en/pets/corsair-cat#install-corsair-cat"><kbd>npm install</kbd></a>
        <a href="https://codexpetdb.com/en/pets/corsair-cat#install-corsair-cat"><kbd>Install in Codex</kbd></a>
      </td>
      <td align="center" width="25%">
        <a href="https://codexpetdb.com/en/pets/da-zhuang"><img src="https://cdn.codexpetdb.com/revisions/019f97a4-00ef-7603-b1ed-ee4d75363b7d/poster.webp" width="128" alt="Da Zhuang Codex pet preview"></a><br>
        <a href="https://codexpetdb.com/en/pets/da-zhuang"><strong>Da Zhuang</strong></a><br>
        <code>npx codexpetdb install &#39;da-zhuang&#39;</code><br>
        <a href="https://codexpetdb.com/en/pets/da-zhuang#install-da-zhuang"><kbd>npm install</kbd></a>
        <a href="https://codexpetdb.com/en/pets/da-zhuang#install-da-zhuang"><kbd>Install in Codex</kbd></a>
      </td>
      <td align="center" width="25%">
        <a href="https://codexpetdb.com/en/pets/da-zhuang-2"><img src="https://cdn.codexpetdb.com/revisions/019f97a4-3183-7609-ae77-cd68ef99bb62/poster.webp" width="128" alt="Da Zhuang 2 Codex pet preview"></a><br>
        <a href="https://codexpetdb.com/en/pets/da-zhuang-2"><strong>Da Zhuang 2</strong></a><br>
        <code>npx codexpetdb install &#39;da-zhuang-2&#39;</code><br>
        <a href="https://codexpetdb.com/en/pets/da-zhuang-2#install-da-zhuang-2"><kbd>npm install</kbd></a>
        <a href="https://codexpetdb.com/en/pets/da-zhuang-2#install-da-zhuang-2"><kbd>Install in Codex</kbd></a>
      </td>
      <td align="center" width="25%">
        <a href="https://codexpetdb.com/en/pets/daodun"><img src="https://cdn.codexpetdb.com/revisions/019f97a4-c535-7282-8885-e00d175e7784/poster.webp" width="128" alt="Daodun Codex pet preview"></a><br>
        <a href="https://codexpetdb.com/en/pets/daodun"><strong>Daodun</strong></a><br>
        <code>npx codexpetdb install &#39;daodun&#39;</code><br>
        <a href="https://codexpetdb.com/en/pets/daodun#install-daodun"><kbd>npm install</kbd></a>
        <a href="https://codexpetdb.com/en/pets/daodun#install-daodun"><kbd>Install in Codex</kbd></a>
      </td>
    </tr>
    <tr>
      <td align="center" width="25%">
        <a href="https://codexpetdb.com/en/pets/daodun-dog"><img src="https://cdn.codexpetdb.com/revisions/019f97a4-f34b-7669-b3e7-b768222fe5c5/poster.webp" width="128" alt="Daodun Dog Codex pet preview"></a><br>
        <a href="https://codexpetdb.com/en/pets/daodun-dog"><strong>Daodun Dog</strong></a><br>
        <code>npx codexpetdb install &#39;daodun-dog&#39;</code><br>
        <a href="https://codexpetdb.com/en/pets/daodun-dog#install-daodun-dog"><kbd>npm install</kbd></a>
        <a href="https://codexpetdb.com/en/pets/daodun-dog#install-daodun-dog"><kbd>Install in Codex</kbd></a>
      </td>
      <td align="center" width="25%">
        <a href="https://codexpetdb.com/en/pets/dimo-stand"><img src="https://cdn.codexpetdb.com/revisions/019f97a5-7fe9-7698-be39-692a0c33503e/poster.webp" width="128" alt="Dimo Stand Codex pet preview"></a><br>
        <a href="https://codexpetdb.com/en/pets/dimo-stand"><strong>Dimo Stand</strong></a><br>
        <code>npx codexpetdb install &#39;dimo-stand&#39;</code><br>
        <a href="https://codexpetdb.com/en/pets/dimo-stand#install-dimo-stand"><kbd>npm install</kbd></a>
        <a href="https://codexpetdb.com/en/pets/dimo-stand#install-dimo-stand"><kbd>Install in Codex</kbd></a>
      </td>
      <td align="center" width="25%">
        <a href="https://codexpetdb.com/en/pets/ding-ding"><img src="https://cdn.codexpetdb.com/revisions/019f97a5-ae79-748b-83a0-6631c102e180/poster.webp" width="128" alt="Ding Ding Codex pet preview"></a><br>
        <a href="https://codexpetdb.com/en/pets/ding-ding"><strong>Ding Ding</strong></a><br>
        <code>npx codexpetdb install &#39;ding-ding&#39;</code><br>
        <a href="https://codexpetdb.com/en/pets/ding-ding#install-ding-ding"><kbd>npm install</kbd></a>
        <a href="https://codexpetdb.com/en/pets/ding-ding#install-ding-ding"><kbd>Install in Codex</kbd></a>
      </td>
      <td align="center" width="25%">
        <a href="https://codexpetdb.com/en/pets/doraemon"><img src="https://cdn.codexpetdb.com/revisions/019f97c8-7d98-7158-bfce-f9818a13edc0/poster.webp" width="128" alt="Doraemon Codex pet preview"></a><br>
        <a href="https://codexpetdb.com/en/pets/doraemon"><strong>Doraemon</strong></a><br>
        <code>npx codexpetdb install &#39;doraemon&#39;</code><br>
        <a href="https://codexpetdb.com/en/pets/doraemon#install-doraemon"><kbd>npm install</kbd></a>
        <a href="https://codexpetdb.com/en/pets/doraemon#install-doraemon"><kbd>Install in Codex</kbd></a>
      </td>
    </tr>
    <tr>
      <td align="center" width="25%">
        <a href="https://codexpetdb.com/en/pets/doro-pink-pup"><img src="https://cdn.codexpetdb.com/revisions/019f97c9-1f5b-777d-a6dd-44bc0304d1ad/poster.webp" width="128" alt="Doro Pink Pup Codex pet preview"></a><br>
        <a href="https://codexpetdb.com/en/pets/doro-pink-pup"><strong>Doro Pink Pup</strong></a><br>
        <code>npx codexpetdb install &#39;doro-pink-pup&#39;</code><br>
        <a href="https://codexpetdb.com/en/pets/doro-pink-pup#install-doro-pink-pup"><kbd>npm install</kbd></a>
        <a href="https://codexpetdb.com/en/pets/doro-pink-pup#install-doro-pink-pup"><kbd>Install in Codex</kbd></a>
      </td>
      <td align="center" width="25%">
        <a href="https://codexpetdb.com/en/pets/douyin-labubu"><img src="https://cdn.codexpetdb.com/revisions/019f97c9-81ec-7559-9b44-dd198b078214/poster.webp" width="128" alt="Douyin Labubu Codex pet preview"></a><br>
        <a href="https://codexpetdb.com/en/pets/douyin-labubu"><strong>Douyin Labubu</strong></a><br>
        <code>npx codexpetdb install &#39;douyin-labubu&#39;</code><br>
        <a href="https://codexpetdb.com/en/pets/douyin-labubu#install-douyin-labubu"><kbd>npm install</kbd></a>
        <a href="https://codexpetdb.com/en/pets/douyin-labubu#install-douyin-labubu"><kbd>Install in Codex</kbd></a>
      </td>
      <td align="center" width="25%">
        <a href="https://codexpetdb.com/en/pets/dundun"><img src="https://cdn.codexpetdb.com/revisions/019f97ca-2372-7374-8005-2085ad03e4c4/poster.webp" width="128" alt="Dundun Codex pet preview"></a><br>
        <a href="https://codexpetdb.com/en/pets/dundun"><strong>Dundun</strong></a><br>
        <code>npx codexpetdb install &#39;dundun&#39;</code><br>
        <a href="https://codexpetdb.com/en/pets/dundun#install-dundun"><kbd>npm install</kbd></a>
        <a href="https://codexpetdb.com/en/pets/dundun#install-dundun"><kbd>Install in Codex</kbd></a>
      </td>
      <td align="center" width="25%">
        <a href="https://codexpetdb.com/en/pets/duo"><img src="https://cdn.codexpetdb.com/revisions/019f97ca-685a-75ba-ba5e-1b1b78af5feb/poster.webp" width="128" alt="Duo Codex pet preview"></a><br>
        <a href="https://codexpetdb.com/en/pets/duo"><strong>Duo</strong></a><br>
        <code>npx codexpetdb install &#39;duo&#39;</code><br>
        <a href="https://codexpetdb.com/en/pets/duo#install-duo"><kbd>npm install</kbd></a>
        <a href="https://codexpetdb.com/en/pets/duo#install-duo"><kbd>Install in Codex</kbd></a>
      </td>
    </tr>
    <tr>
      <td align="center" width="25%">
        <a href="https://codexpetdb.com/en/pets/foxat"><img src="https://cdn.codexpetdb.com/revisions/019f97dc-aebe-702e-9a75-dec8a2c28e99/poster.webp" width="128" alt="Foxat Codex pet preview"></a><br>
        <a href="https://codexpetdb.com/en/pets/foxat"><strong>Foxat</strong></a><br>
        <code>npx codexpetdb install &#39;foxat&#39;</code><br>
        <a href="https://codexpetdb.com/en/pets/foxat#install-foxat"><kbd>npm install</kbd></a>
        <a href="https://codexpetdb.com/en/pets/foxat#install-foxat"><kbd>Install in Codex</kbd></a>
      </td>
      <td align="center" width="25%">
        <a href="https://codexpetdb.com/en/pets/gi-aino"><img src="https://cdn.codexpetdb.com/revisions/019f8c73-1ff4-77b5-8d88-87213159e806/poster.webp" width="128" alt="Gi Aino Codex pet preview"></a><br>
        <a href="https://codexpetdb.com/en/pets/gi-aino"><strong>Gi Aino</strong></a><br>
        <code>npx codexpetdb install &#39;gi-aino&#39;</code><br>
        <a href="https://codexpetdb.com/en/pets/gi-aino#install-gi-aino"><kbd>npm install</kbd></a>
        <a href="https://codexpetdb.com/en/pets/gi-aino#install-gi-aino"><kbd>Install in Codex</kbd></a>
      </td>
      <td align="center" width="25%">
        <a href="https://codexpetdb.com/en/pets/gi-alhaitham"><img src="https://cdn.codexpetdb.com/revisions/019f8c73-6cb1-761c-9821-d2e1dd7ad9b1/poster.webp" width="128" alt="Gi Alhaitham Codex pet preview"></a><br>
        <a href="https://codexpetdb.com/en/pets/gi-alhaitham"><strong>Gi Alhaitham</strong></a><br>
        <code>npx codexpetdb install &#39;gi-alhaitham&#39;</code><br>
        <a href="https://codexpetdb.com/en/pets/gi-alhaitham#install-gi-alhaitham"><kbd>npm install</kbd></a>
        <a href="https://codexpetdb.com/en/pets/gi-alhaitham#install-gi-alhaitham"><kbd>Install in Codex</kbd></a>
      </td>
      <td align="center" width="25%">
        <a href="https://codexpetdb.com/en/pets/gi-alyosha"><img src="https://cdn.codexpetdb.com/revisions/019f88d3-972e-76ac-8a1d-54de5616f8c6/poster.webp" width="128" alt="Gi Alyosha Codex pet preview"></a><br>
        <a href="https://codexpetdb.com/en/pets/gi-alyosha"><strong>Gi Alyosha</strong></a><br>
        <code>npx codexpetdb install &#39;gi-alyosha&#39;</code><br>
        <a href="https://codexpetdb.com/en/pets/gi-alyosha#install-gi-alyosha"><kbd>npm install</kbd></a>
        <a href="https://codexpetdb.com/en/pets/gi-alyosha#install-gi-alyosha"><kbd>Install in Codex</kbd></a>
      </td>
    </tr>
    <tr>
      <td align="center" width="25%">
        <a href="https://codexpetdb.com/en/pets/gi-arlecchino"><img src="https://cdn.codexpetdb.com/revisions/019f8c73-dbb6-71ce-8152-d375071d2840/poster.webp" width="128" alt="Gi Arlecchino Codex pet preview"></a><br>
        <a href="https://codexpetdb.com/en/pets/gi-arlecchino"><strong>Gi Arlecchino</strong></a><br>
        <code>npx codexpetdb install &#39;gi-arlecchino&#39;</code><br>
        <a href="https://codexpetdb.com/en/pets/gi-arlecchino#install-gi-arlecchino"><kbd>npm install</kbd></a>
        <a href="https://codexpetdb.com/en/pets/gi-arlecchino#install-gi-arlecchino"><kbd>Install in Codex</kbd></a>
      </td>
      <td align="center" width="25%">
        <a href="https://codexpetdb.com/en/pets/gi-baizhu"><img src="https://cdn.codexpetdb.com/revisions/019f8c74-259d-721f-9465-e06d5c079bbb/poster.webp" width="128" alt="Gi Baizhu Codex pet preview"></a><br>
        <a href="https://codexpetdb.com/en/pets/gi-baizhu"><strong>Gi Baizhu</strong></a><br>
        <code>npx codexpetdb install &#39;gi-baizhu&#39;</code><br>
        <a href="https://codexpetdb.com/en/pets/gi-baizhu#install-gi-baizhu"><kbd>npm install</kbd></a>
        <a href="https://codexpetdb.com/en/pets/gi-baizhu#install-gi-baizhu"><kbd>Install in Codex</kbd></a>
      </td>
      <td align="center" width="25%">
        <a href="https://codexpetdb.com/en/pets/gi-candace"><img src="https://cdn.codexpetdb.com/revisions/019f8c74-6f05-71a3-b493-f4e4e923dbc5/poster.webp" width="128" alt="Gi Candace Codex pet preview"></a><br>
        <a href="https://codexpetdb.com/en/pets/gi-candace"><strong>Gi Candace</strong></a><br>
        <code>npx codexpetdb install &#39;gi-candace&#39;</code><br>
        <a href="https://codexpetdb.com/en/pets/gi-candace#install-gi-candace"><kbd>npm install</kbd></a>
        <a href="https://codexpetdb.com/en/pets/gi-candace#install-gi-candace"><kbd>Install in Codex</kbd></a>
      </td>
      <td align="center" width="25%">
        <a href="https://codexpetdb.com/en/pets/gi-charlotte"><img src="https://cdn.codexpetdb.com/revisions/019f8c74-b91e-72ca-8048-23e161ad33f0/poster.webp" width="128" alt="Gi Charlotte Codex pet preview"></a><br>
        <a href="https://codexpetdb.com/en/pets/gi-charlotte"><strong>Gi Charlotte</strong></a><br>
        <code>npx codexpetdb install &#39;gi-charlotte&#39;</code><br>
        <a href="https://codexpetdb.com/en/pets/gi-charlotte#install-gi-charlotte"><kbd>npm install</kbd></a>
        <a href="https://codexpetdb.com/en/pets/gi-charlotte#install-gi-charlotte"><kbd>Install in Codex</kbd></a>
      </td>
    </tr>
    <tr>
      <td align="center" width="25%">
        <a href="https://codexpetdb.com/en/pets/gi-chevreuse"><img src="https://cdn.codexpetdb.com/revisions/019f8c75-004d-7711-b2e6-264fe6d28d3e/poster.webp" width="128" alt="Gi Chevreuse Codex pet preview"></a><br>
        <a href="https://codexpetdb.com/en/pets/gi-chevreuse"><strong>Gi Chevreuse</strong></a><br>
        <code>npx codexpetdb install &#39;gi-chevreuse&#39;</code><br>
        <a href="https://codexpetdb.com/en/pets/gi-chevreuse#install-gi-chevreuse"><kbd>npm install</kbd></a>
        <a href="https://codexpetdb.com/en/pets/gi-chevreuse#install-gi-chevreuse"><kbd>Install in Codex</kbd></a>
      </td>
      <td align="center" width="25%">
        <a href="https://codexpetdb.com/en/pets/gi-chiori"><img src="https://cdn.codexpetdb.com/revisions/019f8c75-47f1-731a-804f-3435e50bcb83/poster.webp" width="128" alt="Gi Chiori Codex pet preview"></a><br>
        <a href="https://codexpetdb.com/en/pets/gi-chiori"><strong>Gi Chiori</strong></a><br>
        <code>npx codexpetdb install &#39;gi-chiori&#39;</code><br>
        <a href="https://codexpetdb.com/en/pets/gi-chiori#install-gi-chiori"><kbd>npm install</kbd></a>
        <a href="https://codexpetdb.com/en/pets/gi-chiori#install-gi-chiori"><kbd>Install in Codex</kbd></a>
      </td>
      <td align="center" width="25%">
        <a href="https://codexpetdb.com/en/pets/gi-columbina"><img src="https://cdn.codexpetdb.com/revisions/019f8c75-9128-72bb-9e32-4bf8ccb14a1c/poster.webp" width="128" alt="Gi Columbina Codex pet preview"></a><br>
        <a href="https://codexpetdb.com/en/pets/gi-columbina"><strong>Gi Columbina</strong></a><br>
        <code>npx codexpetdb install &#39;gi-columbina&#39;</code><br>
        <a href="https://codexpetdb.com/en/pets/gi-columbina#install-gi-columbina"><kbd>npm install</kbd></a>
        <a href="https://codexpetdb.com/en/pets/gi-columbina#install-gi-columbina"><kbd>Install in Codex</kbd></a>
      </td>
      <td align="center" width="25%">
        <a href="https://codexpetdb.com/en/pets/gi-cyno"><img src="https://cdn.codexpetdb.com/revisions/019f8c75-da05-72a9-b339-55c0082a77d4/poster.webp" width="128" alt="Gi Cyno Codex pet preview"></a><br>
        <a href="https://codexpetdb.com/en/pets/gi-cyno"><strong>Gi Cyno</strong></a><br>
        <code>npx codexpetdb install &#39;gi-cyno&#39;</code><br>
        <a href="https://codexpetdb.com/en/pets/gi-cyno#install-gi-cyno"><kbd>npm install</kbd></a>
        <a href="https://codexpetdb.com/en/pets/gi-cyno#install-gi-cyno"><kbd>Install in Codex</kbd></a>
      </td>
    </tr>
    <tr>
      <td align="center" width="25%">
        <a href="https://codexpetdb.com/en/pets/gi-dahlia"><img src="https://cdn.codexpetdb.com/revisions/019f8c76-2609-77c6-be63-120ff8a5c2e6/poster.webp" width="128" alt="Gi Dahlia Codex pet preview"></a><br>
        <a href="https://codexpetdb.com/en/pets/gi-dahlia"><strong>Gi Dahlia</strong></a><br>
        <code>npx codexpetdb install &#39;gi-dahlia&#39;</code><br>
        <a href="https://codexpetdb.com/en/pets/gi-dahlia#install-gi-dahlia"><kbd>npm install</kbd></a>
        <a href="https://codexpetdb.com/en/pets/gi-dahlia#install-gi-dahlia"><kbd>Install in Codex</kbd></a>
      </td>
      <td align="center" width="25%">
        <a href="https://codexpetdb.com/en/pets/gi-dehya"><img src="https://cdn.codexpetdb.com/revisions/019f8c76-6ccf-7535-8521-306b9bc0b6dd/poster.webp" width="128" alt="Gi Dehya Codex pet preview"></a><br>
        <a href="https://codexpetdb.com/en/pets/gi-dehya"><strong>Gi Dehya</strong></a><br>
        <code>npx codexpetdb install &#39;gi-dehya&#39;</code><br>
        <a href="https://codexpetdb.com/en/pets/gi-dehya#install-gi-dehya"><kbd>npm install</kbd></a>
        <a href="https://codexpetdb.com/en/pets/gi-dehya#install-gi-dehya"><kbd>Install in Codex</kbd></a>
      </td>
      <td align="center" width="25%">
        <a href="https://codexpetdb.com/en/pets/gi-durin"><img src="https://cdn.codexpetdb.com/revisions/019f8c96-7691-70fc-8e39-f56cebe823b9/poster.webp" width="128" alt="Gi Durin Codex pet preview"></a><br>
        <a href="https://codexpetdb.com/en/pets/gi-durin"><strong>Gi Durin</strong></a><br>
        <code>npx codexpetdb install &#39;gi-durin&#39;</code><br>
        <a href="https://codexpetdb.com/en/pets/gi-durin#install-gi-durin"><kbd>npm install</kbd></a>
        <a href="https://codexpetdb.com/en/pets/gi-durin#install-gi-durin"><kbd>Install in Codex</kbd></a>
      </td>
      <td align="center" width="25%">
        <a href="https://codexpetdb.com/en/pets/gi-emilie"><img src="https://cdn.codexpetdb.com/revisions/019f8c76-ff78-7273-98a1-f31ca37a5d1b/poster.webp" width="128" alt="Gi Emilie Codex pet preview"></a><br>
        <a href="https://codexpetdb.com/en/pets/gi-emilie"><strong>Gi Emilie</strong></a><br>
        <code>npx codexpetdb install &#39;gi-emilie&#39;</code><br>
        <a href="https://codexpetdb.com/en/pets/gi-emilie#install-gi-emilie"><kbd>npm install</kbd></a>
        <a href="https://codexpetdb.com/en/pets/gi-emilie#install-gi-emilie"><kbd>Install in Codex</kbd></a>
      </td>
    </tr>
    <tr>
      <td align="center" width="25%">
        <a href="https://codexpetdb.com/en/pets/gi-flins"><img src="https://cdn.codexpetdb.com/revisions/019f8c77-4691-7588-a4f6-f188d584959d/poster.webp" width="128" alt="Gi Flins Codex pet preview"></a><br>
        <a href="https://codexpetdb.com/en/pets/gi-flins"><strong>Gi Flins</strong></a><br>
        <code>npx codexpetdb install &#39;gi-flins&#39;</code><br>
        <a href="https://codexpetdb.com/en/pets/gi-flins#install-gi-flins"><kbd>npm install</kbd></a>
        <a href="https://codexpetdb.com/en/pets/gi-flins#install-gi-flins"><kbd>Install in Codex</kbd></a>
      </td>
      <td align="center" width="25%">
        <a href="https://codexpetdb.com/en/pets/gi-freminet"><img src="https://cdn.codexpetdb.com/revisions/019f8c77-904d-76c3-94df-2c266f692749/poster.webp" width="128" alt="Gi Freminet Codex pet preview"></a><br>
        <a href="https://codexpetdb.com/en/pets/gi-freminet"><strong>Gi Freminet</strong></a><br>
        <code>npx codexpetdb install &#39;gi-freminet&#39;</code><br>
        <a href="https://codexpetdb.com/en/pets/gi-freminet#install-gi-freminet"><kbd>npm install</kbd></a>
        <a href="https://codexpetdb.com/en/pets/gi-freminet#install-gi-freminet"><kbd>Install in Codex</kbd></a>
      </td>
      <td align="center" width="25%">
        <a href="https://codexpetdb.com/en/pets/gi-gaming"><img src="https://cdn.codexpetdb.com/revisions/019f8c77-da6a-771f-bd64-21b7dda6eab5/poster.webp" width="128" alt="Gi Gaming Codex pet preview"></a><br>
        <a href="https://codexpetdb.com/en/pets/gi-gaming"><strong>Gi Gaming</strong></a><br>
        <code>npx codexpetdb install &#39;gi-gaming&#39;</code><br>
        <a href="https://codexpetdb.com/en/pets/gi-gaming#install-gi-gaming"><kbd>npm install</kbd></a>
        <a href="https://codexpetdb.com/en/pets/gi-gaming#install-gi-gaming"><kbd>Install in Codex</kbd></a>
      </td>
      <td align="center" width="25%">
        <a href="https://codexpetdb.com/en/pets/gi-iansan"><img src="https://cdn.codexpetdb.com/revisions/019f8c78-23ec-72cd-abf0-fa9d370c3c58/poster.webp" width="128" alt="Gi Iansan Codex pet preview"></a><br>
        <a href="https://codexpetdb.com/en/pets/gi-iansan"><strong>Gi Iansan</strong></a><br>
        <code>npx codexpetdb install &#39;gi-iansan&#39;</code><br>
        <a href="https://codexpetdb.com/en/pets/gi-iansan#install-gi-iansan"><kbd>npm install</kbd></a>
        <a href="https://codexpetdb.com/en/pets/gi-iansan#install-gi-iansan"><kbd>Install in Codex</kbd></a>
      </td>
    </tr>
    <tr>
      <td align="center" width="25%">
        <a href="https://codexpetdb.com/en/pets/gi-illuga"><img src="https://cdn.codexpetdb.com/revisions/019f89b0-fdc6-7578-b163-cdd4bbb42d78/poster.webp" width="128" alt="Gi Illuga Codex pet preview"></a><br>
        <a href="https://codexpetdb.com/en/pets/gi-illuga"><strong>Gi Illuga</strong></a><br>
        <code>npx codexpetdb install &#39;gi-illuga&#39;</code><br>
        <a href="https://codexpetdb.com/en/pets/gi-illuga#install-gi-illuga"><kbd>npm install</kbd></a>
        <a href="https://codexpetdb.com/en/pets/gi-illuga#install-gi-illuga"><kbd>Install in Codex</kbd></a>
      </td>
      <td align="center" width="25%">
        <a href="https://codexpetdb.com/en/pets/gi-ineffa"><img src="https://cdn.codexpetdb.com/revisions/019f8c95-0fb6-7419-9272-df9ab6530c5a/poster.webp" width="128" alt="Gi Ineffa Codex pet preview"></a><br>
        <a href="https://codexpetdb.com/en/pets/gi-ineffa"><strong>Gi Ineffa</strong></a><br>
        <code>npx codexpetdb install &#39;gi-ineffa&#39;</code><br>
        <a href="https://codexpetdb.com/en/pets/gi-ineffa#install-gi-ineffa"><kbd>npm install</kbd></a>
        <a href="https://codexpetdb.com/en/pets/gi-ineffa#install-gi-ineffa"><kbd>Install in Codex</kbd></a>
      </td>
      <td align="center" width="25%">
        <a href="https://codexpetdb.com/en/pets/gi-jahoda"><img src="https://cdn.codexpetdb.com/revisions/019f8c78-d806-70e9-ac77-9e56cd1957a6/poster.webp" width="128" alt="Gi Jahoda Codex pet preview"></a><br>
        <a href="https://codexpetdb.com/en/pets/gi-jahoda"><strong>Gi Jahoda</strong></a><br>
        <code>npx codexpetdb install &#39;gi-jahoda&#39;</code><br>
        <a href="https://codexpetdb.com/en/pets/gi-jahoda#install-gi-jahoda"><kbd>npm install</kbd></a>
        <a href="https://codexpetdb.com/en/pets/gi-jahoda#install-gi-jahoda"><kbd>Install in Codex</kbd></a>
      </td>
      <td align="center" width="25%">
        <a href="https://codexpetdb.com/en/pets/gi-kaveh"><img src="https://cdn.codexpetdb.com/revisions/019f8c79-1fd9-71eb-9425-7b39ef9d28d2/poster.webp" width="128" alt="Gi Kaveh Codex pet preview"></a><br>
        <a href="https://codexpetdb.com/en/pets/gi-kaveh"><strong>Gi Kaveh</strong></a><br>
        <code>npx codexpetdb install &#39;gi-kaveh&#39;</code><br>
        <a href="https://codexpetdb.com/en/pets/gi-kaveh#install-gi-kaveh"><kbd>npm install</kbd></a>
        <a href="https://codexpetdb.com/en/pets/gi-kaveh#install-gi-kaveh"><kbd>Install in Codex</kbd></a>
      </td>
    </tr>
    <tr>
      <td align="center" width="25%">
        <a href="https://codexpetdb.com/en/pets/gi-kinich"><img src="https://cdn.codexpetdb.com/revisions/019f8c79-6be7-7426-a862-835e127b5bd4/poster.webp" width="128" alt="Gi Kinich Codex pet preview"></a><br>
        <a href="https://codexpetdb.com/en/pets/gi-kinich"><strong>Gi Kinich</strong></a><br>
        <code>npx codexpetdb install &#39;gi-kinich&#39;</code><br>
        <a href="https://codexpetdb.com/en/pets/gi-kinich#install-gi-kinich"><kbd>npm install</kbd></a>
        <a href="https://codexpetdb.com/en/pets/gi-kinich#install-gi-kinich"><kbd>Install in Codex</kbd></a>
      </td>
      <td align="center" width="25%">
        <a href="https://codexpetdb.com/en/pets/gi-kirara"><img src="https://cdn.codexpetdb.com/revisions/019f8c79-b4bd-7228-8af4-b0c04806138d/poster.webp" width="128" alt="Gi Kirara Codex pet preview"></a><br>
        <a href="https://codexpetdb.com/en/pets/gi-kirara"><strong>Gi Kirara</strong></a><br>
        <code>npx codexpetdb install &#39;gi-kirara&#39;</code><br>
        <a href="https://codexpetdb.com/en/pets/gi-kirara#install-gi-kirara"><kbd>npm install</kbd></a>
        <a href="https://codexpetdb.com/en/pets/gi-kirara#install-gi-kirara"><kbd>Install in Codex</kbd></a>
      </td>
      <td align="center" width="25%">
        <a href="https://codexpetdb.com/en/pets/gi-lan-yan"><img src="https://cdn.codexpetdb.com/revisions/019f8c79-fc82-72cd-94c8-fd50e65cf1fd/poster.webp" width="128" alt="Gi Lan Yan Codex pet preview"></a><br>
        <a href="https://codexpetdb.com/en/pets/gi-lan-yan"><strong>Gi Lan Yan</strong></a><br>
        <code>npx codexpetdb install &#39;gi-lan-yan&#39;</code><br>
        <a href="https://codexpetdb.com/en/pets/gi-lan-yan#install-gi-lan-yan"><kbd>npm install</kbd></a>
        <a href="https://codexpetdb.com/en/pets/gi-lan-yan#install-gi-lan-yan"><kbd>Install in Codex</kbd></a>
      </td>
      <td align="center" width="25%">
        <a href="https://codexpetdb.com/en/pets/gi-lauma"><img src="https://cdn.codexpetdb.com/revisions/019f8c93-7090-7462-be9b-f84cda6220b8/poster.webp" width="128" alt="Gi Lauma Codex pet preview"></a><br>
        <a href="https://codexpetdb.com/en/pets/gi-lauma"><strong>Gi Lauma</strong></a><br>
        <code>npx codexpetdb install &#39;gi-lauma&#39;</code><br>
        <a href="https://codexpetdb.com/en/pets/gi-lauma#install-gi-lauma"><kbd>npm install</kbd></a>
        <a href="https://codexpetdb.com/en/pets/gi-lauma#install-gi-lauma"><kbd>Install in Codex</kbd></a>
      </td>
    </tr>
    <tr>
      <td align="center" width="25%">
        <a href="https://codexpetdb.com/en/pets/gi-layla"><img src="https://cdn.codexpetdb.com/revisions/019f8c7a-900c-749c-aeb5-a7e694656bff/poster.webp" width="128" alt="Gi Layla Codex pet preview"></a><br>
        <a href="https://codexpetdb.com/en/pets/gi-layla"><strong>Gi Layla</strong></a><br>
        <code>npx codexpetdb install &#39;gi-layla&#39;</code><br>
        <a href="https://codexpetdb.com/en/pets/gi-layla#install-gi-layla"><kbd>npm install</kbd></a>
        <a href="https://codexpetdb.com/en/pets/gi-layla#install-gi-layla"><kbd>Install in Codex</kbd></a>
      </td>
      <td align="center" width="25%">
        <a href="https://codexpetdb.com/en/pets/gi-linnea"><img src="https://cdn.codexpetdb.com/revisions/019f89b1-6260-72ee-90dc-d3b2159b96e8/poster.webp" width="128" alt="Gi Linnea Codex pet preview"></a><br>
        <a href="https://codexpetdb.com/en/pets/gi-linnea"><strong>Gi Linnea</strong></a><br>
        <code>npx codexpetdb install &#39;gi-linnea&#39;</code><br>
        <a href="https://codexpetdb.com/en/pets/gi-linnea#install-gi-linnea"><kbd>npm install</kbd></a>
        <a href="https://codexpetdb.com/en/pets/gi-linnea#install-gi-linnea"><kbd>Install in Codex</kbd></a>
      </td>
      <td align="center" width="25%">
        <a href="https://codexpetdb.com/en/pets/gi-lohen"><img src="https://cdn.codexpetdb.com/revisions/019f8c7a-fe62-76ba-b5f3-c4c9199e6603/poster.webp" width="128" alt="Gi Lohen Codex pet preview"></a><br>
        <a href="https://codexpetdb.com/en/pets/gi-lohen"><strong>Gi Lohen</strong></a><br>
        <code>npx codexpetdb install &#39;gi-lohen&#39;</code><br>
        <a href="https://codexpetdb.com/en/pets/gi-lohen#install-gi-lohen"><kbd>npm install</kbd></a>
        <a href="https://codexpetdb.com/en/pets/gi-lohen#install-gi-lohen"><kbd>Install in Codex</kbd></a>
      </td>
      <td align="center" width="25%">
        <a href="https://codexpetdb.com/en/pets/gi-manekina"><img src="https://cdn.codexpetdb.com/revisions/019f89b3-860e-7583-85e3-991882e0e458/poster.webp" width="128" alt="Gi Manekina Codex pet preview"></a><br>
        <a href="https://codexpetdb.com/en/pets/gi-manekina"><strong>Gi Manekina</strong></a><br>
        <code>npx codexpetdb install &#39;gi-manekina&#39;</code><br>
        <a href="https://codexpetdb.com/en/pets/gi-manekina#install-gi-manekina"><kbd>npm install</kbd></a>
        <a href="https://codexpetdb.com/en/pets/gi-manekina#install-gi-manekina"><kbd>Install in Codex</kbd></a>
      </td>
    </tr>
    <tr>
      <td align="center" width="25%">
        <a href="https://codexpetdb.com/en/pets/gi-manekina-2"><img src="https://cdn.codexpetdb.com/revisions/019f89b4-02f2-761b-abf3-a9a45da929b6/poster.webp" width="128" alt="Gi Manekina Codex pet preview"></a><br>
        <a href="https://codexpetdb.com/en/pets/gi-manekina-2"><strong>Gi Manekina</strong></a><br>
        <code>npx codexpetdb install &#39;gi-manekina-2&#39;</code><br>
        <a href="https://codexpetdb.com/en/pets/gi-manekina-2#install-gi-manekina-2"><kbd>npm install</kbd></a>
        <a href="https://codexpetdb.com/en/pets/gi-manekina-2#install-gi-manekina-2"><kbd>Install in Codex</kbd></a>
      </td>
      <td align="center" width="25%">
        <a href="https://codexpetdb.com/en/pets/gi-odette"><img src="https://cdn.codexpetdb.com/revisions/019f88ee-151d-750f-8899-5693cf570446/poster.webp" width="128" alt="Gi Odette Codex pet preview"></a><br>
        <a href="https://codexpetdb.com/en/pets/gi-odette"><strong>Gi Odette</strong></a><br>
        <code>npx codexpetdb install &#39;gi-odette&#39;</code><br>
        <a href="https://codexpetdb.com/en/pets/gi-odette#install-gi-odette"><kbd>npm install</kbd></a>
        <a href="https://codexpetdb.com/en/pets/gi-odette#install-gi-odette"><kbd>Install in Codex</kbd></a>
      </td>
      <td align="center" width="25%">
        <a href="https://codexpetdb.com/en/pets/gi-prune"><img src="https://cdn.codexpetdb.com/revisions/019f8c9a-2278-76fa-ac7d-1d44ab7f1d71/poster.webp" width="128" alt="Gi Prune Codex pet preview"></a><br>
        <a href="https://codexpetdb.com/en/pets/gi-prune"><strong>Gi Prune</strong></a><br>
        <code>npx codexpetdb install &#39;gi-prune&#39;</code><br>
        <a href="https://codexpetdb.com/en/pets/gi-prune#install-gi-prune"><kbd>npm install</kbd></a>
        <a href="https://codexpetdb.com/en/pets/gi-prune#install-gi-prune"><kbd>Install in Codex</kbd></a>
      </td>
      <td align="center" width="25%">
        <a href="https://codexpetdb.com/en/pets/gi-sandrone"><img src="https://cdn.codexpetdb.com/revisions/019f89b5-6f5a-749b-ab1f-5655a3d0f578/poster.webp" width="128" alt="Gi Sandrone Codex pet preview"></a><br>
        <a href="https://codexpetdb.com/en/pets/gi-sandrone"><strong>Gi Sandrone</strong></a><br>
        <code>npx codexpetdb install &#39;gi-sandrone&#39;</code><br>
        <a href="https://codexpetdb.com/en/pets/gi-sandrone#install-gi-sandrone"><kbd>npm install</kbd></a>
        <a href="https://codexpetdb.com/en/pets/gi-sandrone#install-gi-sandrone"><kbd>Install in Codex</kbd></a>
      </td>
    </tr>
    <tr>
      <td align="center" width="25%">
        <a href="https://codexpetdb.com/en/pets/gi-zibai"><img src="https://cdn.codexpetdb.com/revisions/019f8cb5-4614-77cf-8092-ce508770ca9f/poster.webp" width="128" alt="Gi Zibai Codex pet preview"></a><br>
        <a href="https://codexpetdb.com/en/pets/gi-zibai"><strong>Gi Zibai</strong></a><br>
        <code>npx codexpetdb install &#39;gi-zibai&#39;</code><br>
        <a href="https://codexpetdb.com/en/pets/gi-zibai#install-gi-zibai"><kbd>npm install</kbd></a>
        <a href="https://codexpetdb.com/en/pets/gi-zibai#install-gi-zibai"><kbd>Install in Codex</kbd></a>
      </td>
      <td width="25%"></td>
      <td width="25%"></td>
      <td width="25%"></td>
    </tr>
  </tbody>
</table>

## Requirements and installation

Node.js 20 or newer is required.

```sh
npm install --global codexpetdb
petdb version
codexpetdb version
```

Commands can also be run without a global installation:

```sh
npx codexpetdb list
```

## Global usage

```text
petdb [--debug] <command>
codexpetdb [--debug] <command>
```

Both binary names run the same CLI. The examples below use the shorter
`petdb` name.

`--debug` can appear before or after the command. When an HTTP call fails, it
writes the status code and redacted response body to stderr. Sensitive fields
are removed and the response is limited to 16 KiB. Successful requests and
failures without an HTTP response do not produce an HTTP debug record.

```sh
petdb --debug submit ./my-pet --yes
petdb whoami --debug
```

The CLI reads these environment variables:

| Variable | Purpose | Default |
| --- | --- | --- |
| `CODEX_HOME` | Codex data directory and pet installation root | `~/.codex` |
| `PETDB_SITE_URL` | CodexPetDB HTTP(S) site origin | Production site |

`PETDB_SITE_URL` must be an origin without a path, credentials, query, or
fragment. Credentials are isolated by this origin.

## Command reference

### `petdb list`

Lists every currently available pet in catalog order.

```sh
petdb list
```

The command downloads the static Pet Catalog once and prints each pet's slug,
display name, and author. It does not install anything or require login.

### `petdb install <pet-slug>`

Installs one pet by its exact slug.

```sh
petdb install sleepy-fox
```

The pet is installed in `$CODEX_HOME/pets/<pet-slug>`, which defaults to
`~/.codex/pets/<pet-slug>`. The CLI reads site discovery and the Pet Catalog,
derives the package URL from the trusted asset origin, then verifies the
response content type, byte length, SHA-256 digest, ZIP structure, and
`pet.json.id`. Installation is recoverable if writing the destination fails.

A successful install sends a best-effort metrics request with a two-second
timeout. Metrics failures never change the command result.

### `petdb install --collection <collection-slug>`

Installs every pet in a collection in its declared order.

```sh
petdb install --collection cozy-friends
```

The command downloads the Pet and Collection catalogs once, then installs up
to 100 pets. It stops on the first failure and preserves pets already
installed, so rerunning it is safe.

### `petdb login`

Signs in through a browser-approved device authorization flow.

```sh
petdb login
```

The CLI prints a complete verification URL containing the one-time code, the
code itself, and the expiration time, then attempts to open the browser. The
URL can be copied and opened without entering the code separately. The CLI
continues polling until the request is approved, denied, expired, cancelled
with `Ctrl+C`, or fails. If the current site already has a valid credential,
`login` prints that identity instead of switching accounts; run `petdb logout`
first to use another account.

Credentials are stored in the OS Keychain when available. The fallback file is
written atomically and restricted to mode `0600` on supported Unix systems:

| Platform | Fallback credential file |
| --- | --- |
| macOS and Linux | `${XDG_CONFIG_HOME:-~/.config}/codexpetdb/credentials.json` |
| Windows | `%APPDATA%\CodexPetDB\credentials.json` |

### `petdb logout [--local-only]`

Revokes the current session and removes its local credential.

```sh
petdb logout
petdb logout --local-only
```

Without `--local-only`, the CLI revokes the server session first. A network or
service failure leaves the local credential intact so the revocation can be
retried. `--local-only` removes only the credential stored on this computer.

### `petdb whoami`

Shows the account associated with the current site credential.

```sh
petdb whoami
```

Output includes the site origin, public UID, name, email, and session expiry.
The bearer token is never printed.

### `petdb submit <path> [--yes]`

Validates and submits one or more new pets for review.

```sh
petdb submit ./my-pet
petdb submit ./my-pet.zip --yes
petdb submit ./pet-batch --yes
```

`<path>` can be one of the following:

1. A directory containing `pet.json` and its spritesheet.
2. A `.zip` file with `pet.json` and its spritesheet at the archive root.
3. A parent directory whose direct child directories are pet packages.

Batch mode scans only direct child directories containing `pet.json`; it does
not scan nested directories or child ZIP files. Each package is submitted
independently and a final success/failure summary is printed. Successful items
remain submitted if a later item fails.

In an interactive terminal, the CLI asks for confirmation unless `--yes` is
present. Non-interactive use must pass `--yes`.

The command requires login. It creates an upload session, uploads the validated
manifest, spritesheet, and generated poster, then finalizes the submission. A
failure triggers a best-effort upload abort. If the slug already belongs to the
current user, use `petdb edit`; a slug owned by someone else is a conflict. The
CLI never invents a suffix.

### `petdb edit <slug> [options]`

Creates a pending revision for a pet owned by the signed-in user.

```sh
petdb edit sleepy-fox --description "A calmer forest companion"
petdb edit sleepy-fox --display-name "Sleepy Fox"
petdb edit sleepy-fox --manifest ./pet.json
petdb edit sleepy-fox --spritesheet ./spritesheet.webp
petdb edit sleepy-fox --zip ./sleepy-fox.zip
petdb edit sleepy-fox \
  --zip ./sleepy-fox.zip \
  --description "Text options override manifest values"
```

Available options:

| Option | Meaning |
| --- | --- |
| `--description <text>` | Replace the description |
| `--display-name <name>` | Replace the display name |
| `--manifest <path>` | Use values from a replacement `pet.json` |
| `--spritesheet <path>` | Upload a replacement spritesheet and regenerate the poster |
| `--zip <path>` | Use a root-level package ZIP as the replacement source |

At least one option is required, and each option can appear only once.
`--zip` cannot be combined with `--manifest` or `--spritesheet`. Text options
can be combined with any file input and override the corresponding manifest
values.

The replacement spritesheet must remain in the active revision's V1 or V2
format. Its filename can change between `spritesheet.png` and
`spritesheet.webp`; the new manifest is updated accordingly.

Every successful edit creates a new pending revision based on the current
active revision. The active revision remains online and installable until the
new revision is approved. If another pending revision exists, the server
withdraws and replaces it only after the new upload finalizes successfully; a
failed edit leaves the previous pending revision unchanged.

### `petdb help`

Prints command, option, and environment summaries. The aliases `--help` and
`-h`, or invoking `petdb` without arguments, produce the same output.

```sh
petdb help
```

### `petdb version`

Prints the installed CLI version. The aliases `--version` and `-v` are also
supported.

```sh
petdb version
```

## Submission validation

`submit` and file-based `edit` perform local validation before upload:

| Item | Requirement |
| --- | --- |
| `pet.json` | UTF-8 JSON object, no larger than 64 KiB after canonicalization |
| `id` | Valid, non-reserved pet slug |
| `displayName` | Non-empty, at most 100 characters |
| `description` | Non-empty, at most 1,000 characters |
| `spritesheetPath` | Exactly `spritesheet.png` or `spritesheet.webp` |
| Spritesheet size | Non-empty and no larger than 10 MiB |
| V1 dimensions | `1536×1872` |
| V2 dimensions | `1536×2288` |
| Image | Extension matches PNG/WebP signature and supports alpha transparency |

If `formatVersion` is present in `pet.json`, it must match the dimensions. The
CLI uses `sharp` to crop the upper-left `192×208` region and writes a quality
90 `poster.webp`. The server independently validates the uploaded objects
before accepting the revision.

## Exit codes

| Code | Meaning |
| ---: | --- |
| `0` | Success |
| `2` | Invalid command or arguments |
| `3` | Network failure or timeout |
| `4` | Integrity or validation failure |
| `5` | Filesystem failure |
| `6` | Authentication failure |
| `7` | Service or API failure |

## Public catalogs

- [Live pet catalog](https://cdn.codexpetdb.com/catalogs/v1/pets.json)
- [Live collection catalog](https://cdn.codexpetdb.com/catalogs/v1/collections.json)

The catalogs are generated and published by the private Web project. They are
linked for community inspection but are not copied into this repository or the
npm package.

## Development

The npm runtime supports Node.js 20 and newer. Development and publication use
Node.js 26.4 and pnpm 11.13; CI additionally runs the packed tarball on Node.js
20.19 across Linux, macOS, and Windows.

```sh
pnpm install --frozen-lockfile
pnpm check
pnpm openapi:check
pnpm typecheck
pnpm test
pnpm build
pnpm pack:smoke
```

The committed internal SDK is generated from `contracts/cli-openapi.json`:

```sh
pnpm openapi:generate
pnpm openapi:check
```

The contract is synchronized from the private Web repository. It is not packed
into npm, and the generated SDK has no public package export.

## Release process for maintainers

Prepare and verify the release on a clean `main` commit before creating an
annotated version tag. The package version, CLI version, changelog heading, and
tag must match.

```sh
pnpm check
pnpm openapi:check
pnpm typecheck
pnpm test
pnpm build
pnpm pack:smoke
pnpm deploy:manual -- --dry-run
pnpm deploy:manual
```

`deploy:manual` validates the clean tagged commit, dispatches the GitHub Actions
publish workflow, and waits for it to finish. It does not create commits, push
branches or tags, create a GitHub Release, or run `npm publish` locally. After
the npm workflow succeeds, create the GitHub Release from the prepared
`RELEASE_NOTES.md`.

```sh
gh release create v1.1.3 \
  --verify-tag \
  --title "codexpetdb v1.1.3" \
  --notes-file RELEASE_NOTES.md
```

## License

MIT
