///////////////////////////////////////////////////////////////////////////
// Copyright © Esri. All Rights Reserved.
//
// Licensed under the Apache License Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//    http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.
///////////////////////////////////////////////////////////////////////////


define(['dojo/_base/declare', 
  'jimu/BaseWidget',
  'jimu/tokenUtils',
  'jimu/loaderplugins/jquery-loader!https://code.jquery.com/jquery-git1.min.js',
  "esri/layers/GraphicsLayer",
  "esri/graphic"
],
function(declare, BaseWidget, tokenUtils, $,
  GraphicsLayer,
  Graphic
){

  const Config = {
    'pindrop-layer': {
      id: 'pindrop'
    },
    'flood-polygon-layer': {
      id: 'flood-polygon'
    },
    'pin2flood-layer' : {
      url: 'https://flood.arcgis.com/arcgis/rest/services/NFIE/NWM_Flood_Inundation_Polygons/MapServer/0',
      fields: {
        hid: {
          fieldName: 'hid'
        },
        compositeid: {
          fieldName: 'compositeid'
        }
      }
    },
    'pindrop-records': {
      url: 'https://services.arcgis.com/jIL9msH9OI208GCb/arcgis/rest/services/PinDrops/FeatureServer/0',
      fields: {
        'querytime': {
          fieldName: 'querytime'
        },
        'compositeid': {
          fieldName: 'compositeid'
        },
        'userid': {
          fieldName: 'userid'
        },
      }
    },
    'flood-polygon-records': {
      url: 'https://services.arcgis.com/jIL9msH9OI208GCb/arcgis/rest/services/Pin2FloodPolygon/FeatureServer/0',
      fields: {
        'querytime': {
          fieldName: 'pin_drop_time'
        },
        'compositeid': {
          fieldName: 'compositeid'
        },
        'userid': {
          fieldName: 'userid'
        },
      }
    }
  };

  return declare(BaseWidget, {

    // isExecuting:false,
    userId:null,
    token:null,

    startup: function(){
      const map = this.map;

      this.initFloodPolygonLayer();
      this.initPindropLayer();
      this.addClickEventHandlerToMap(map);
    },

    onClose: function(){
      this.clearPin2FloodFeatures();
    },

    initPindropLayer: function(){
      const pindropLayer = new GraphicsLayer({
        id: Config["pindrop-layer"].id
      });
      this.map.addLayer(pindropLayer);
      // console.log(pindropLayer);
    },

    initFloodPolygonLayer: function(){
      const floodPolygonLayer = new GraphicsLayer({
        id: Config["flood-polygon-layer"].id
      });
      this.map.addLayer(floodPolygonLayer);
      // console.log(floodPolygonLayer);
    },

    addClickEventHandlerToMap: function(map){
      const self = this;
      map.on("click", function(event){
        // console.log('clicked on map', event.mapPoint);
        const point = event.mapPoint;
        self.execPin2FloodQuery(point);
      });
    },

    execPin2FloodQuery: function(pindropGeometry){

      const self = this;

      this.clearPin2FloodFeatures();

      this.showPinDrop(pindropGeometry);

      self.queryCompositeId(pindropGeometry)
      .then(function(compositeid){
        // console.log(compositeid)

        self.queryFloodInnudationPolygon(compositeid).then(function(floodInnudationPolygon){

          if(floodInnudationPolygon && floodInnudationPolygon.geometry){

            floodInnudationPolygon.geometry.spatialReference = { wkid: 102100 };

            // console.log('floodInnudationPolygon', floodInnudationPolygon);
            self.showFloodPolygon(floodInnudationPolygon);

            self.syncPin2FloodPolygon(floodInnudationPolygon);
            self.syncPinDrop(pindropGeometry, compositeid);
          }

        }).catch(function(err){
          console.error('failed to get flood innudation polygon', err);
        })

      })
      .catch(function(err){
        console.error('failed to execPin2FloodQuery', err);
        self.showErrorMessage();
      })
    },

    queryCompositeId: function(pindropGeometry){

      return new Promise(function(resolve, reject){
        const requestUrl = Config["pin2flood-layer"].url + '/query';

        const params = {
          where: '1=1',
          geometry: JSON.stringify(pindropGeometry),
          geometryType: 'esriGeometryPoint',
          spatialRel: 'esriSpatialRelIntersects',
          returnGeometry: false,
          outFields: 'compositeid, hid',
          orderByFields: Config["pin2flood-layer"].fields.hid.fieldName,
          // resultRecordCount: 10,
          f: 'json'
        };
  
        $.get( requestUrl, params )
          .done(function( response ) {
            // console.log( "pin2flood query is done", response );
  
            if(response.features && response.features.length){
              const pin2floodResult = response.features[0];
              // console.log( "pin2floodResult", pin2floodResult );
              resolve(pin2floodResult.attributes.compositeid);
            } else {
              console.log("no pin2flood Result is found");
              reject(null);
            }
  
          })
          .fail(function() {
            console.log( "failed to query pin2flood" );
            reject(null);
          });
      });

    },

    queryFloodInnudationPolygon: function(compositeId){

      return new Promise(function(resolve, reject){
        const requestUrl = Config["pin2flood-layer"].url + '/query';

        const params = {
          where: 'compositeid = ' + compositeId,
          returnGeometry: true,
          outFields: '*',
          f: 'json'
        };
  
        $.get( requestUrl, params )
          .done(function( response ) {
            if(response.features && response.features.length){
              resolve(response.features[0]);
            } else {
              console.log("no flood innudation polygon Result is found for composite id", compositeId);
              reject(null);
            }
  
          })
          .fail(function() {
            console.log( "failed to query flood innudation polygon" );
            reject(null);
          });
      });

    },

    // save the pin drop to a hosted feature service
    syncPinDrop: function(point, compositeid){
      // const oauthData = this.getEsriAuthDataFromCookie();

      const credential = tokenUtils.getPortalCredential(this.appConfig.portalUrl);

      const requestUrl = Config["pindrop-records"].url + '/addFeatures';

      const querytime = new Date().getTime();

      const feature2add = {
        "geometry": point,
        "attributes":{
          "userid": credential.userId,
          "compositeid": compositeid,
          "querytime":querytime,
        }
      };

      const params = {
        'features': JSON.stringify(feature2add),
        'f': 'json',
        'token': credential.token
      };

      $.post( requestUrl, params)
        .done(function( data ) {
          console.log( "pin drop feature is synced");
        })
        .fail(function() {
          console.error( "failed to sync pin drop feature" );
        });
    },

    showPinDrop: function(point){

      const pindropLayer = this.map.getLayer(Config["pindrop-layer"].id);

      if(pindropLayer){

        const pointGraphic = new Graphic({
          "geometry": point,
          "symbol": {
            "color":[254,88,62,255],
            "size":12,
            "angle":0,
            "xoffset":0,
            "yoffset":0,
            "type":"esriSMS",
            "outline":{
              "color":[255,255,255,200],
              "width":2,
             "type":"esriSLS",
             "style":"esriSLSSolid"
            }
          }
        });

        pindropLayer.add(pointGraphic);
      }
      
    },

    clearPinDrop: function(){
      const pindropLayer = this.map.getLayer(Config["pindrop-layer"].id);

      if(pindropLayer){
        pindropLayer.clear();
      }
    },

    syncPin2FloodPolygon: function(feature){

      // const oauthData = this.getEsriAuthDataFromCookie();

      const credential = tokenUtils.getPortalCredential(this.appConfig.portalUrl);

      const requestUrl = Config["flood-polygon-records"].url + '/addFeatures';
      // const FieldNameQueryTime = Config["flood-polygon-records"].fields.querytime;
      // const FieldNameUserId= Config["flood-polygon-records"].fields.userid;
      // const FieldNameCompositeId = Config["flood-polygon-records"].fields.compositeid;

      const querytime = new Date().getTime();

      const feature2add = {
        "geometry": feature.geometry,
        "attributes": {
          'userId': credential.userId,
          'compositeid': feature.attributes.compositeid,
          'pin_drop_time': querytime
        }
      };

      const params = {
        'features': JSON.stringify(feature2add),
        'f': 'json',
        'token': credential.token
      };

      $.post( requestUrl, params)
        .done(function( data ) {
          console.log( "pin2flood polygon feature is synced");
        })
        .fail(function() {
          console.error( "failed to sync pin2flood polygon feature" );
        });
    },

    showFloodPolygon: function(feature){
      const floodPolygonLayer = this.map.getLayer(Config["flood-polygon-layer"].id);

      if(floodPolygonLayer){
        // const geometry = feature.geometry;
        // geometry.spatialReference = { wkid: 102100 };

        const polygonGraphic = new Graphic({
          "geometry": feature.geometry,
          "symbol": {
            "color":[0,160,255,120],
            "type":"esriSFS",
            "style": "esriSFSSolid",
            "outline":{
              "color":[255,255,255,200],
              "width":1,
             "type":"esriSLS",
             "style":"esriSLSSolid"
            }
          }
        });
        
        floodPolygonLayer.add(polygonGraphic);
      }
    },

    clearFloodPolygon: function(){
      const floodPolygonLayer = this.map.getLayer(Config["flood-polygon-layer"].id);

      if(floodPolygonLayer){
        floodPolygonLayer.clear();
      }
    },

    showErrorMessage: function(){
      $('.jimu-widget-pin2flood .pin2flood-widget-error-message').text('No Flood Polygon is found');

      setTimeout(function(){
        $('.jimu-widget-pin2flood .pin2flood-widget-error-message').text('');
      }, 2500);
    },

    clearPin2FloodFeatures: function(){
      this.clearFloodPolygon();
      this.clearPinDrop();
    },

    // // call this function to get 'token' or 'userId' that will be required when upload data
    // getEsriAuthDataFromCookie: function(){
    //   const wab_auth = this.readCookie('wab_auth') || this.readCookie('esri_auth');
    //   const oauthData = JSON.parse(decodeURIComponent(wab_auth));
    //   return {
    //     token: oauthData.token,
    //     userId: oauthData.userId
    //   };
    // },

    // readCookie: function(name){
    //   var nameEQ = name + "=";
    //   var ca = document.cookie.split(';');
    //   for (var i = 0; i < ca.length; i++) {
    //       var c = ca[i];
    //       while (c.charAt(0) == ' ') c = c.substring(1, c.length);
    //       if (c.indexOf(nameEQ) == 0) return c.substring(nameEQ.length, c.length);
    //   }
    //   return null;
    // },

  });
});