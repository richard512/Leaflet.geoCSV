/*
* Copyright 2013 - GPL
* Iván Eixarch <ivan@sinanimodelucro.org>
* https://github.com/joker-x/Leaflet.geoCSV
*
* This program is free software; you can redistribute it and/or modify
* it under the terms of the GNU General Public License as published by
* the Free Software Foundation; either version 2 of the License, or
* (at your option) any later version.
*
* This program is distributed in the hope that it will be useful,
* but WITHOUT ANY WARRANTY; without even the implied warranty of
* MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
* GNU General Public License for more details.
*
* You should have received a copy of the GNU General Public License
* along with this program; if not, write to the Free Software
* Foundation, Inc., 51 Franklin Street, Fifth Floor, Boston,
* MA 02110-1301, USA.
*/
xx = ""
L.GeoCSV = L.GeoJSON.extend({

  //opciones por defecto
  options: {
    titles: [],
    latitudeTitle: ["lat", "lt", "latitude"],
    longitudeTitle: ["lng", "ln", "longitude", "long"],
    colorIconsByColumn: "",
    colorColumnMin: 9999999999999999999999999999999999999999999999999999999999,
    colorColumnMax: -999999999999999999999999999999999999999999999999999999999,
    fieldSeparator: ',',
    lineSeparator: '\n',
    deleteDoubleQuotes: true,
    firstLineTitles: true
  },

  _propertiesNames: [],

  initialize: function (csv, options) {
    this._propertiesNames = [];
    L.Util.setOptions (this, options);
    L.GeoJSON.prototype.initialize.call (this, csv, options);
  },

  _guessDelimiters: function(text, possibleDelimiters) {
      return possibleDelimiters.filter(weedOut)[0];

      function weedOut (delimiter) {
          var cache = -1;
          return text.split('\n').every(checkLength);

          function checkLength (line) {
              if (!line) {
                  return true;
              }

              var length = line.split(delimiter).length;
              if (cache < 0) {
                  cache = length;
              }
              return cache === length && length > 1;
          }
      }
  },

  addData: function (data) {
    if (typeof data === 'string') {
      //leemos titulos
      var titulos = this.options.titles;
      if (this.options.firstLineTitles) {
        data = data.split(this.options.lineSeparator);
        if (data.length < 2) return;
        titulos = data[0];
        data.splice(0,1);
        data = data.join(this.options.lineSeparator);
        this.options.fieldSeparator = this._guessDelimiters(data, ['\t', ';', ','])
        console.log('Guessed delimiter = "' + this.options.fieldSeparator + '"')
        titulos = titulos.trim().split(this.options.fieldSeparator);
        for (var i=0; i<titulos.length; i++) {
          titulos[i] = this._deleteDoubleQuotes(titulos[i]);
        }
        this.options.titles = titulos;
      }
      //generamos _propertiesNames
      for (var i=0; i<titulos.length; i++) {
         var prop = titulos[i].toLowerCase().replace(/[^\w ]+/g,'').replace(/ +/g,'_');
         if (prop == '' || prop == '_') prop = 'prop-'+i;
         this._propertiesNames[i] = prop;
      }
      //convertimos los datos a geoJSON
      data = this._csv2json(data);
    }
    return L.GeoJSON.prototype.addData.call (this, data);
  },

  getPropertyName: function (title) {
    var pos = this.options.titles.indexOf(title)
      , prop = '';
    if (pos >= 0) prop = this._propertiesNames[pos];
    return prop;
  },

  getPropertyTitle: function (prop) {
    var pos = this._propertiesNames.indexOf(prop)
      , title = '';
    if (pos >= 0) title = this.options.titles[pos];
    return title;
  },

  _deleteDoubleQuotes: function (cadena) {
    if (this.options.deleteDoubleQuotes) cadena = cadena.trim().replace(/^"/,"").replace(/"$/,"");
    return cadena;
  },

  _GetCenterFromDegrees: function (data)
  {       
    if (!(data.length > 0)){
        return false;
    } 

    var num_coords = data.length;

    var X = 0.0;
    var Y = 0.0;
    var Z = 0.0;

    for(i = 0; i < data.length; i++){
        var lat = data[i][0] * Math.PI / 180;
        var lon = data[i][1] * Math.PI / 180;

        var a = Math.cos(lat) * Math.cos(lon);
        var b = Math.cos(lat) * Math.sin(lon);
        var c = Math.sin(lat);

        X += a;
        Y += b;
        Z += c;
    }

    X /= num_coords;
    Y /= num_coords;
    Z /= num_coords;

    var lon = Math.atan2(Y, X);
    var hyp = Math.sqrt(X * X + Y * Y);
    var lat = Math.atan2(Z, hyp);

    var newX = (lat * 180 / Math.PI);
    var newY = (lon * 180 / Math.PI);

    return new Array(newX, newY);
  },

  _csv2json: function (csv) {
    var json = {};
    json["type"]="FeatureCollection";
    json["features"]=[];
    var titulos = this.options.titles;

    csv = csv.split(this.options.lineSeparator);

    var latTitle = ""
    for (i in this.options.titles){
      if (this.options.latitudeTitle.indexOf(this.options.titles[i]) > -1){
        latTitle = this.options.titles[i]
      }
    }

    var lngTitle = ""
    for (i in this.options.titles){
      if (this.options.longitudeTitle.indexOf(this.options.titles[i]) > -1){
        lngTitle = this.options.titles[i]
      }
    }

    var locations = [];

    for (var num_linea = 0; num_linea < csv.length; num_linea++) {
      var fields = csv[num_linea].trim().split(this.options.fieldSeparator)
        , lng = parseFloat(fields[titulos.indexOf(lngTitle)])
        , lat = parseFloat(fields[titulos.indexOf(latTitle)]);
      if (fields.length==titulos.length && lng<180 && lng>-180 && lat<90 && lat>-90) {
        locations.push([lat, lng])
        if (this.options.colorIconsByColumn){
          var colorcolumnnum = parseFloat(fields[titulos.indexOf(this.options.colorIconsByColumn)])
          if (colorcolumnnum < this.options.colorColumnMin) this.options.colorColumnMin = colorcolumnnum;
          if (colorcolumnnum > this.options.colorColumnMax) this.options.colorColumnMax = colorcolumnnum;
        }
        var feature = {};
        feature["type"]="Feature";
        feature["geometry"]={};
        feature["properties"]={};
        feature["geometry"]["type"]="Point";
        feature["geometry"]["coordinates"]=[lng,lat];
        //propiedades
        for (var i=0; i<titulos.length; i++) {
          if (titulos[i] != latTitle && titulos[i] != lngTitle) {
            feature["properties"][this._propertiesNames[i]] = this._deleteDoubleQuotes(fields[i]);
          }
        }
        json["features"].push(feature);
      } 
    }
    
    var center = this._GetCenterFromDegrees(locations)
    mapa.panTo(new L.LatLng(center[0], center[1]));

    return json;
  }

});

L.geoCsv = function (csv_string, options) {
  return new L.GeoCSV (csv_string, options);
};
