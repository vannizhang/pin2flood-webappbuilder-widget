# Pin2Flood Widget
Use this Widget in your Web AppBuilder app to query the Pin2Flood polygons and save the query results in your own ArcGIS Online Feature Layers. 

## How to use

_Please read this [tutorial](https://www.esri.com/about/newsroom/arcwatch/add-custom-widgets-to-web-appbuilder-for-arcgis-developer-edition/) first If you are not familiar with how to use custom widgets in your Web AppBuilder app._

### Create the Pin2Flood widget

1. Download the Pin2Flood widget ZIP file from [here](https://github.com/vannizhang/pin2flood-webappbuilder-widget/blob/master/widgets/Pin2FloodWidget.zip).

2. Unzip it and and you will see a folder called Pin2Flood which contains all the relevant files needed for the Pin2Flood widget.

3. Make a copy of the [Pin2Flood] folder and paste it to the **widgets** floder under stemapp (e.g. `path/to/WAB/client/stemapp/widgets/`).

### Create Feature Layers

You need to create two Hosted Feature Layers on ArcGIS Online that the widget can use to save the Pin Drop points and it's associated Pin2Flood polygons.

- Open "My Content" page and click the "Create" button to create a feature layer
![image](https://user-images.githubusercontent.com/3142684/71122542-b3497180-2195-11ea-87d7-c904e7a9b0bc.png)

- Choose the "Create Feature Layer from URL" option to create two feature layers using the URLs below
![image](https://user-images.githubusercontent.com/3142684/71125293-7f714a80-219b-11ea-91d1-e9840e611d8c.png)

  1. Feature Layer Template for Pin Drops:
https://services.arcgis.com/jIL9msH9OI208GCb/arcgis/rest/services/Pin_Drops_Template/FeatureServer

  2. Feature Layer Template for Pin2Flood Polygons: 
https://services.arcgis.com/jIL9msH9OI208GCb/arcgis/rest/services/Pin2Flood_Polygon_Template/FeatureServer

### Configure the widget:
1. Once you have these two layers created, first make sure you **enable editing** (Open the details page of the hosted feature layer and click Settings tab).

2. open the `config.json` file in the `path/to/WAB/client/stemapp/widgets/Pin2Flood` folder.

3. Copy the URL of each layer you created from previous step and paste it in the `config.json` file.  

```
{
  "pin2FloodServices": {
      "pinDrops": {
        "url": {URL-4-YOUR-OWN-PIN-DROPS-LAYER}
      },
      "pin2floodPolygons": {
        "url": {URL-4-YOUR-OWN-PIN2FLOOD-POLYGONS-LAYER}
      }
  }
}
```
Now you can add this Pin2Flood Widget to your app and start using it.
