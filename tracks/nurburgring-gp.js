'use strict';
// =========================================================================
// Circuito: Nürburgring Grand-Prix-Strecke (Nürburg, Eifel, Alemania)
// Homologación Grado 1 FIA · 5,148 km · 15 curvas oficiales
// 100% Autocontenido: Geometría, Topografía Eifel, Haupttribüne (T4a),
// Mercedes-Benz Tribüne (T4), Boxes de 33 talleres con torre de control,
// Castillo medieval de Nürburg (Burg Nürburg) y bordillos disuasorios (sausage kerbs).
// =========================================================================
(() => {
  TRACKS.register({
    id: 'nurburgring-gp',
    name: 'Nürburgring GP',
    subtitle: 'Grand-Prix-Strecke · Nürburg',
    specs: '5,148 km · 15 curvas · Grado 1 FIA · Eifel & Burg Nürburg',
    storageKey: 'mejor-nurburgring-gp',

    hw: 7.2, // Pista ancha de 14,4 m homologada FIA GT3
    startS: -18,
    startD: -2.0,

    pit: { s0: -130, s1: 240, wallD: 12.5, laneD0: 13.5, laneD1: 22.0, bldS0: -75, bldS1: 95, bldD0: 22.8, bldD1: 38, padD1: 62 },
    stand: { s0: -90, s1: 135, d0: -15.5, d1: -42 },

    // Puntos de la línea central extraídos del plano oficial FIA (1017 vértices a ~5 m)
    points: [[-60,0],[-49.5,0.4],[-38.9,1],[-28.4,1.9],[-17.8,2.6],[-7.1,3.1],[3.6,3.3],[9.6,3.3],[15.7,3.2],[21.7,3.3],[27.7,3.3],[33.7,3.2],[39.8,3.1],[45.8,3],[51.8,3.1],[57.9,3],[63.9,3],[69.9,3],[75.9,2.9],[82,3],[87.9,3],[94,2.9],[100,2.8],[106.1,2.8],[112.1,2.8],[118.1,2.7],[124.2,2.7],[130.2,2.7],[136.2,2.7],[142.2,2.7],[148.3,2.6],[154.3,2.5],[160.3,2.4],[166.4,2.4],[172.4,2.4],[178.5,2.3],[184.5,2.3],[190.5,2.4],[196.5,2.3],[202.5,2.3],[208.6,2.2],[214.6,2.1],[220.7,2.1],[226.7,2.1],[232.7,2.1],[238.7,2],[244.7,2.1],[250.7,2.1],[256.8,2],[262.8,1.9],[268.9,1.8],[274.9,1.8],[281,1.7],[287,1.7],[293,1.7],[299,1.6],[305,1.7],[311,1.7],[317.1,1.6],[323.1,1.6],[329.1,1.7],[335,1.8],[340.7,1.8],[346.5,1.9],[352.2,1.9],[358,2],[363.8,2.1],[369.5,2.1],[375.3,2.2],[381,2.2],[386.8,2.3],[392.6,2.2],[398.3,2.3],[404.2,2.2],[410.2,2.2],[416.2,2.2],[422.2,2.1],[428.2,2.1],[434.2,2.2],[440.3,2.1],[446.2,2.2],[452,2.2],[457.8,2.2],[463.6,2.3],[469.2,2.6],[474.9,2.8],[480.6,3.1],[486.2,3.6],[491.8,4.2],[497.4,4.7],[502.9,5.4],[508.5,6.1],[514,6.8],[519.6,7.7],[525.3,8.7],[530.8,9.5],[536.2,10.4],[541.7,11.3],[547.1,12.4],[552.5,13.4],[558,14.3],[563.4,15.3],[568.8,16.3],[574.3,17.3],[579.7,18.4],[585.1,19.5],[590.4,20.7],[595.9,21.9],[601.4,23.5],[606.8,25.1],[612.1,26.8],[617.1,29],[621.3,31.5],[625.1,34.4],[628,37.4],[630.1,41],[631.3,44.6],[631.4,48.4],[630.7,52.3],[629.2,56.3],[627,60.2],[624,63.9],[620.1,67.7],[615.4,71.4],[610.2,74.9],[604.7,78.2],[599.1,81.2],[593.2,83.9],[587.2,86.6],[581.3,89],[575.7,91.3],[569.9,93.4],[564.2,95.5],[558.2,97.5],[552.4,99.5],[546.8,101.3],[541.4,102.9],[536,104.4],[530.7,106],[525.5,107.5],[520.5,108.9],[515.9,110.6],[511.3,112.4],[506.7,114.4],[502.3,116.7],[498,119.4],[493.9,122.3],[489.9,125.5],[486.1,129],[482.5,132.8],[479.4,136.9],[476.5,141.3],[473.8,146],[471.4,151],[469.3,156.3],[467.7,161.5],[466.7,166.7],[465.9,171.7],[465.6,176.7],[465.8,181.5],[466.5,186.4],[467.7,191.1],[469.2,195.7],[470.9,200],[473,204.2],[475.4,208.2],[477.9,211.8],[480.6,215.4],[483.4,218.9],[486.6,222.4],[489.9,226],[493.5,229.6],[497.1,233.1],[500.9,236.6],[504.8,240.1],[508.9,243.6],[513.1,247.1],[517.3,250.6],[521.7,254],[526.2,257.4],[530.5,260.8],[534.9,264],[539.4,267.1],[543.9,270.1],[548.4,273.1],[553,275.9],[557.6,278.5],[562.3,281.1],[566.9,283.7],[571.6,286.2],[576.5,288.7],[581.4,291.1],[586.5,293.5],[591.8,295.6],[597.1,297.7],[602.4,299.8],[607.8,301.5],[613.3,303],[618.8,304.3],[624.1,305.3],[629.3,305.9],[634.5,305.9],[639.6,305.4],[644.6,304.3],[649.4,302.7],[653.9,300.5],[658,298],[661.6,294.8],[664.8,290.9],[667.2,286.6],[668.9,281.8],[669.9,276.6],[670.4,271.2],[670.3,265.8],[669.6,260.5],[668.3,255.3],[666.5,250.3],[664.3,245.4],[661.7,240.8],[658.7,236.3],[655.6,232],[652.3,227.9],[649,224.3],[645.8,220.7],[642.8,217.3],[640.1,213.7],[637.8,209.9],[635.7,205.9],[634,201.8],[633,197.4],[632.2,193],[632.3,188.4],[632.7,183.9],[633.8,179.3],[635.4,174.8],[637.7,170.3],[640.4,165.9],[643.4,161.7],[646.6,157.6],[650.2,153.8],[654,150.1],[657.8,146.7],[661.9,143.2],[666,140.1],[670.2,137],[674.4,133.9],[678.7,130.8],[683.1,127.6],[687.4,124.5],[691.7,121.3],[696,118.2],[700.5,114.9],[705.1,111.7],[709.8,108.4],[714.3,105.1],[718.9,101.8],[723.7,98.4],[728.5,95],[733.3,91.6],[738.1,88.2],[742.8,84.8],[747.6,81.4],[752.4,78],[757.2,74.5],[761.9,71.2],[766.5,68],[771.3,64.6],[776.1,61.2],[781,57.8],[785.9,54.5],[790.8,51],[795.6,47.6],[800.5,44.1],[805.4,40.7],[810.5,37.3],[815.5,33.9],[820.4,30.5],[825.6,27],[830.9,23.5],[836.4,20.1],[841.9,16.7],[847.6,13.4],[853.4,10.1],[859.5,6.7],[865.8,3.3],[872.2,-0.1],[878.7,-3.5],[885,-6.8],[891.3,-10],[897.4,-13.1],[903.2,-16],[908.8,-18.8],[914,-21.5],[919,-24],[923.6,-26.3],[928,-28.5],[932.1,-30.6],[935.9,-32.6],[939.5,-34.3],[943.1,-36.1],[946.7,-37.8],[950.4,-39.6],[954,-41.4],[957.6,-43.1],[961.2,-45],[965.2,-47],[969.4,-49.2],[973.9,-51.5],[978.7,-53.9],[983.8,-56.5],[989.2,-59.2],[994.9,-62],[1000.6,-65],[1006.4,-68.1],[1012.3,-71.3],[1018.2,-74.6],[1024.3,-78],[1030,-81.5],[1035.5,-84.9],[1040.7,-88.4],[1045.7,-91.9],[1050.2,-95.7],[1054.3,-99.6],[1058.2,-103.5],[1061.8,-107.6],[1065,-112],[1067.9,-116.5],[1070.5,-121.3],[1072.8,-126.3],[1074.7,-131.2],[1076.3,-136.4],[1077.3,-141.8],[1077.9,-147.4],[1078.1,-153.1],[1077.9,-158.9],[1077.3,-164.9],[1076.2,-171.1],[1075,-177.3],[1073.4,-183.6],[1071.6,-190],[1069.7,-196.4],[1067.6,-202.9],[1065.5,-209.4],[1063.2,-216],[1061.1,-222.5],[1058.9,-229],[1056.8,-235.3],[1055,-241.5],[1053.5,-247.5],[1052.2,-253.5],[1051.2,-259.4],[1050.5,-265.1],[1050.4,-270.7],[1050.6,-276.2],[1051.2,-281.5],[1052.2,-286.6],[1053.8,-291.3],[1056,-295.9],[1059,-300.1],[1062.3,-303.9],[1065.9,-307.3],[1069.9,-310.1],[1074.2,-312.5],[1078.8,-314.4],[1083.6,-315.7],[1088.6,-316.5],[1093.7,-316.9],[1099.1,-316.8],[1104.7,-316.5],[1110.2,-315.7],[1115.5,-314.5],[1120.8,-313.1],[1126.1,-311.8],[1131.6,-310.1],[1137.1,-308.7],[1142.6,-307.1],[1148,-305.4],[1153.5,-303.8],[1158.9,-302.1],[1164.4,-300.5],[1169.8,-298.9],[1175.3,-297.2],[1180.7,-295.6],[1186.2,-294],[1191.8,-292.6],[1197.3,-291.2],[1202.8,-289.7],[1208.2,-288],[1213.7,-286.4],[1219.1,-284.7],[1224.7,-283.3],[1230.2,-281.9],[1235.7,-280.5],[1241.2,-279],[1246.8,-277.6],[1252.4,-276.4],[1257.9,-275],[1263.4,-273.6],[1268.9,-272.1],[1274.5,-270.7],[1280.1,-269.5],[1285.7,-268.3],[1291.2,-267],[1296.8,-265.6],[1302.4,-264.3],[1308,-263.1],[1313.5,-262.1],[1318.9,-261],[1324.3,-259.9],[1329.5,-259.1],[1334.8,-258.2],[1339.9,-257.7],[1344.9,-257],[1350.1,-256.5],[1355.2,-256],[1360.4,-255.8],[1365.6,-255.5],[1370.9,-255.4],[1376.2,-255.4],[1381.6,-255.2],[1387.2,-255.2],[1392.9,-255.3],[1398.7,-255.4],[1404.6,-255.6],[1410.7,-255.6],[1416.8,-255.8],[1422.9,-256.1],[1429,-256.3],[1435,-256.5],[1441.1,-256.7],[1447.2,-257],[1453.4,-257.3],[1459.5,-257.7],[1465.5,-258],[1471.4,-258.3],[1477.3,-258.7],[1483,-259.1],[1488.6,-259.6],[1494,-260],[1499.3,-260.6],[1504.4,-261.1],[1509.4,-261.6],[1514.1,-262.2],[1518.8,-262.8],[1523.3,-263.3],[1527.6,-263.9],[1532.2,-264.5],[1536.5,-265.3],[1540.8,-266],[1545.2,-266.8],[1549.7,-267.5],[1554.1,-268.3],[1558.5,-269.2],[1563.2,-270],[1567.7,-270.9],[1572.4,-272],[1577.1,-273],[1581.9,-274.2],[1586.9,-275.4],[1592.1,-276.7],[1597.3,-278.2],[1602.6,-279.6],[1607.9,-281.1],[1613.3,-282.7],[1618.6,-284.2],[1623.8,-285.8],[1629,-287.2],[1634.1,-288.7],[1639.2,-290],[1644.5,-291.2],[1649.6,-292],[1654.7,-292.8],[1659.6,-293.3],[1664.7,-293.2],[1669.6,-292.8],[1674.4,-292.1],[1679.1,-291.1],[1683.8,-289.4],[1688.3,-287.1],[1692.5,-284.5],[1696.4,-281.6],[1699.9,-278.2],[1702.9,-274.4],[1705.5,-270.1],[1707.4,-265.5],[1708.7,-260.7],[1709.4,-255.8],[1709.4,-250.6],[1709,-245.6],[1708.1,-240.7],[1706.7,-236.3],[1704.8,-232],[1702.4,-227.9],[1699.5,-224],[1696.3,-220.6],[1692.5,-217.6],[1688.3,-214.9],[1683.9,-212.7],[1679,-210.9],[1674,-209.4],[1668.8,-208.2],[1663.3,-207.3],[1657.6,-206.5],[1651.7,-205.7],[1645.7,-205.2],[1639.8,-204.8],[1633.7,-204.5],[1627.6,-204.3],[1621.6,-204.2],[1615.6,-204.1],[1609.5,-204],[1603.5,-204.1],[1597.5,-204],[1591.4,-204],[1585.4,-204],[1579.4,-204.1],[1573.4,-204.1],[1567.5,-204.2],[1561.4,-204.3],[1555.4,-204.3],[1549.5,-204.4],[1543.5,-204.4],[1537.4,-204.5],[1531.4,-204.5],[1525.4,-204.5],[1519.4,-204.5],[1513.4,-204.7],[1507.4,-204.7],[1501.4,-204.7],[1495.5,-204.9],[1489.4,-204.9],[1483.4,-204.8],[1477.4,-204.8],[1471.4,-204.9],[1465.3,-204.8],[1459.3,-204.8],[1453.4,-204.9],[1447.3,-204.9],[1441.3,-204.9],[1435.3,-204.9],[1429.3,-204.8],[1423.2,-204.9],[1417.2,-204.9],[1411.2,-204.9],[1405.2,-204.9],[1399.2,-205.1],[1393.2,-205.1],[1387.2,-205],[1381.2,-205],[1375.2,-205.1],[1369.3,-204.9],[1363.5,-204.7],[1357.9,-204.4],[1352.2,-204],[1346.7,-203.4],[1341.4,-202.7],[1336.3,-201.9],[1331.4,-200.8],[1326.4,-199.4],[1321.7,-197.9],[1317.2,-196.1],[1312.9,-194.1],[1308.7,-191.6],[1304.5,-189],[1300.5,-186],[1296.6,-182.8],[1292.9,-179.3],[1289.2,-175.5],[1285.6,-171.4],[1282,-167.4],[1278.8,-163.2],[1275.5,-158.9],[1272.3,-154.5],[1269,-149.8],[1265.9,-145.1],[1262.8,-140.5],[1259.7,-135.7],[1256.6,-131],[1253.3,-126.4],[1250.2,-121.7],[1246.8,-117.1],[1243.3,-112.4],[1239.8,-107.8],[1236.4,-103.3],[1232.9,-99],[1229.5,-94.9],[1225.9,-90.8],[1222.3,-87],[1218.5,-83.3],[1214.5,-79.6],[1210.5,-76.2],[1206.3,-72.8],[1201.9,-69.5],[1197.3,-66.3],[1192.4,-63],[1187.2,-59.8],[1181.9,-56.5],[1176.7,-53.4],[1171.4,-50.4],[1166.2,-47.5],[1161,-44.7],[1156,-41.9],[1150.7,-39],[1145.1,-36.1],[1139.5,-33.2],[1133.9,-30.3],[1128.4,-27.5],[1122.8,-24.6],[1117,-21.6],[1110.9,-18.6],[1104.5,-15.4],[1097.8,-12],[1090.8,-8.5],[1083.6,-5],[1076.3,-1.5],[1069.3,2],[1062.6,5.4],[1056.2,8.6],[1050.1,11.6],[1044.3,14.6],[1038.8,17.4],[1033.5,20.1],[1028.2,22.9],[1022.9,25.6],[1017.7,28.4],[1012.4,31.1],[1007.1,33.9],[1001.7,36.6],[996,39.4],[990.1,42.4],[983.8,45.6],[977.3,48.8],[970.4,52.3],[963.3,55.8],[956.1,59.4],[948.8,62.9],[941.6,66.4],[934.4,69.9],[927.1,73.5],[919.9,77],[912.7,80.5],[905.5,84.1],[898.6,87.4],[891.7,90.8],[885,94.2],[878.6,97.4],[872.5,100.4],[866.6,103.4],[861.1,106.2],[855.9,108.8],[850.9,111.3],[846.2,113.7],[841.8,116],[837.4,118.3],[833,120.7],[828.9,123.1],[825.1,125.7],[821.3,128.4],[817.6,131.5],[814,134.8],[810.6,138.5],[807.4,142.4],[804.5,146.7],[801.7,151.3],[799.4,156],[797.5,160.8],[796.2,165.6],[795.3,170.9],[794.8,176],[794.7,181.2],[795.1,186.7],[795.9,192.2],[797.2,198],[798.7,203.7],[800.3,209.3],[802.3,215],[804.5,221],[807.1,227.1],[809.8,233.6],[812.5,240.1],[815.3,246.4],[818.1,252.9],[820.9,259.4],[823.6,265.9],[826.2,272.3],[828.7,278.6],[831.2,285],[833.7,291.4],[836,297.5],[838.1,303.4],[839.9,309.1],[841.4,314.7],[843,320.4],[844.2,326.1],[845.1,331.7],[845.5,337.1],[845.7,342.5],[845.6,347.7],[845.1,353.1],[844.2,358.3],[842.8,363.5],[841.1,368.6],[839,373.7],[836.6,378.5],[833.9,383.1],[830.7,387.3],[827.4,391.1],[823.9,394.5],[820.2,397.6],[816.2,400.3],[811.9,402.7],[807.4,404.7],[802.7,406.4],[798,407.8],[793.3,409],[788.5,409.9],[783.7,410.8],[779.1,411.5],[774.3,412],[769.6,412.7],[764.9,413.3],[760.2,413.9],[755.6,414.5],[751.2,415],[747,415.5],[742.8,416.1],[738.6,416.7],[734.4,417.1],[730.2,417.7],[726,418.3],[721.8,418.8],[717.6,419.4],[713.3,420],[708.8,420.4],[704.4,420.9],[700.1,421.4],[695.6,421.8],[691.2,422.3],[686.6,422.9],[681.9,423.5],[677.1,424],[672.4,424.5],[667.6,425],[662.9,425.6],[658.1,426.1],[653.6,426.7],[649,427.3],[644.5,427.9],[640,428.5],[635.4,429.1],[630.9,429.6],[626.6,430.1],[622.3,430.7],[617.8,431.2],[613.2,431.8],[608.4,432.4],[603.4,433],[598.3,433.5],[593.2,434.2],[588.1,434.7],[583,435.2],[578,435.9],[572.9,436.4],[567.7,436.9],[562.7,437.6],[557.8,438.2],[553,438.7],[548.5,439.3],[544.1,439.8],[539.9,440.3],[535.5,440.8],[530.9,441.4],[526.2,442],[521.3,442.6],[516.2,443.2],[511.1,443.7],[506,444.3],[500.9,444.9],[495.8,445.5],[490.7,446],[485.7,446.7],[480.6,447.2],[475.6,447.7],[470.8,448.4],[466.1,448.9],[461.6,449.4],[457.3,450],[453,450.6],[448.5,451.1],[443.9,451.6],[439.1,452.3],[434.1,452.8],[429,453.3],[423.7,453.9],[418.2,454.5],[412.7,454.9],[407,455.4],[401.1,455.5],[395.2,455.5],[389.2,455.5],[383.3,455.4],[377.4,455],[371.5,454.5],[365.8,453.7],[360.2,452.5],[354.6,451.2],[349.1,449.6],[343.7,448],[338.3,446],[333,444],[327.7,441.9],[322.4,439.8],[317.3,437.3],[312.1,434.8],[307,432.3],[301.9,429.6],[296.8,427],[291.6,424.5],[286.5,421.8],[281.4,419.1],[276.4,416.2],[271.4,413.4],[266.3,410.6],[261.3,407.7],[256.3,404.9],[251.3,401.9],[246.3,399],[241.2,396.1],[236.2,393.1],[231.3,390.1],[226.3,387.1],[221.3,384.1],[216.3,381.1],[211.3,378.2],[206.3,375.1],[201.3,372.2],[196.4,369.2],[191.4,366.1],[186.4,363.2],[181.5,360.1],[176.5,357.1],[171.5,354.1],[166.5,351.2],[161.5,348.2],[156.5,345.2],[151.5,342.3],[146.6,339.3],[141.8,336.4],[137.1,333.5],[132.3,330.7],[127.5,327.8],[122.7,324.9],[117.9,322],[113.2,319],[108.4,316.2],[103.6,313.3],[98.8,310.4],[94,307.5],[89.3,304.5],[84.3,301.5],[79.3,298.6],[74.5,295.6],[69.8,292.8],[65,289.9],[60.2,287.1],[55.4,284.2],[50.6,281.3],[45.8,278.5],[41,275.5],[36.2,272.7],[31.4,269.8],[26.7,267],[21.9,264.1],[17,261.1],[12,258.2],[7,255.1],[2,252.2],[-3,249.3],[-8,246.2],[-13,243.3],[-17.9,240.3],[-22.9,237.3],[-27.9,234.3],[-32.9,231.4],[-37.9,228.4],[-43,225.6],[-48,222.9],[-53.1,220.2],[-58.3,217.7],[-63.5,215.4],[-68.6,213.7],[-73.5,212.3],[-78.2,211.7],[-82.9,211.6],[-87.5,212.1],[-92,213.2],[-96.3,214.6],[-100.7,216.2],[-105.1,217.8],[-109.6,219.5],[-114.1,221.3],[-118.5,223],[-123,224.5],[-127.7,225.5],[-132.6,226.1],[-137.6,226.2],[-142.8,225.7],[-148.1,224.8],[-153.5,223.5],[-159,221.9],[-164.4,220.2],[-169.8,218.3],[-175.1,216.3],[-180.4,214.2],[-185.7,212],[-190.9,209.7],[-196.2,207.5],[-201.2,205.1],[-206.2,202.7],[-211.1,200.2],[-215.8,197.7],[-220.4,195.1],[-224.9,192.5],[-229.4,190],[-233.8,187.5],[-238,184.9],[-242.1,182.2],[-246.3,179.7],[-250.4,177.1],[-254.4,174.4],[-258.6,171.7],[-262.7,169.1],[-266.7,166.4],[-270.9,163.8],[-274.9,161.1],[-279,158.4],[-283.2,155.8],[-287.2,153.1],[-291.3,150.5],[-295.4,147.6],[-299.5,145],[-303.6,142.1],[-308,139.4],[-312.3,136.5],[-316.7,133.7],[-321.2,130.7],[-325.7,127.7],[-330.4,124.6],[-335.1,121.3],[-339.7,118],[-344.3,114.7],[-348.7,111.4],[-353.1,107.9],[-357.3,104],[-361.2,99.9],[-365,95.7],[-368.2,91.3],[-370.9,86.8],[-373.3,82],[-375,77.1],[-376.3,72.1],[-376.8,66.9],[-377.1,61.7],[-376.8,56.4],[-376.1,51.1],[-374.8,46.2],[-372.7,41.6],[-370,37.2],[-366.6,32.8],[-363.1,28.7],[-359,25.1],[-354.8,21.7],[-350.2,18.7],[-345.4,16],[-340.4,13.7],[-335.1,11.8],[-329.6,10.1],[-323.8,8.7],[-317.8,7.5],[-312,6.5],[-306.2,5.9],[-300.5,5.4],[-294.6,5],[-288.7,4.8],[-282.7,4.7],[-276.6,4.6],[-270.6,4.5],[-264.6,4.7],[-258.6,4.6],[-252.5,4.5],[-246.5,4.4],[-240.5,4.4],[-234.4,4.4],[-228.4,4.4],[-222.4,4.4],[-216.4,4.3],[-210.4,4.4],[-204.4,4.4],[-198.4,4.4],[-192.3,4.3],[-186.3,4.2],[-180.3,4.3],[-174.2,4.2],[-168.2,4.2],[-162.3,4.1],[-156.5,3.8],[-150.9,3.2],[-145.3,2.3],[-139.6,1.3],[-134.1,0.6],[-128.7,0.2],[-120.9,0.1],[-110.8,-0.1],[-100.7,-0.1],[-90.5,-0.1],[-80.4,-0.2],[-70.3,-0.2]],

    // Las 15 curvas oficiales FIA para pianos, escapatorias de grava y HUD
    corners: [
      { name: 'Yokohama-S (T1)', s0: 524, s1: 619, R: 45, ang: 115 },
      { name: 'Mercedes-Arena (T2)', s0: 709, s1: 800, R: 55, ang: 95 },
      { name: 'Mercedes-Arena Loop (T3)', s0: 898, s1: 1026, R: 48, ang: -165 },
      { name: 'Mercedes-Arena Exit (T4)', s0: 1045, s1: 1105, R: 50, ang: 65 },
      { name: 'Kurve 5 (T5)', s0: 1442, s1: 1549, R: 130, ang: -30 },
      { name: 'Ford-Kurve (T6)', s0: 1603, s1: 1700, R: 55, ang: 95 },
      { name: 'Dunlop-Kehre (T7)', s0: 2121, s1: 2286, R: 50, ang: -165 },
      { name: 'Schumacher-S 1 (T8)', s0: 2506, s1: 2613, R: 135, ang: 45 },
      { name: 'Schumacher-S 2 (T9)', s0: 2613, s1: 2728, R: 145, ang: -40 },
      { name: 'Kumho-Kurve 1 (T10)', s0: 3009, s1: 3115, R: 110, ang: 30 },
      { name: 'Kumho-Kurve 2 (T11)', s0: 3197, s1: 3303, R: 65, ang: 80 },
      { name: 'Bit-Kurve (T12)', s0: 3589, s1: 3704, R: 160, ang: 40 },
      { name: 'Veedol-Schikane 1 (T13)', s0: 4029, s1: 4090, R: 45, ang: -45 },
      { name: 'Veedol-Schikane 2 (T14)', s0: 4090, s1: 4155, R: 50, ang: 85 },
      { name: 'Coca-Cola-Kurve (T15)', s0: 4302, s1: 4435, R: 65, ang: 110 }
    ],

    // Perfil altimétrico oficial (55 m de desnivel total: mínima en Dunlop -28m y máxima en Kumho +24m)
    elevKeys: [
      [0, 0],
      [524, -4.5],
      [800, -8.0],
      [1026, -8.0],
      [1105, -7.0],
      [1549, -14.0],
      [1700, -20.0],
      [2180, -28.0],
      [2613, -10.0],
      [2728, 0.0],
      [3115, 16.0],
      [3303, 24.0],
      [3704, 18.0],
      [4090, 6.0],
      [4435, 0.5],
      [5148, 0.0]
    ],

    // Iluminación deportiva de media tarde soleada en las montañas de Eifel
    sun: { elDeg: 34, azDeg: 148, colorElDeg: 30 },

    // Tramos húmedos en zonas sombrías de arboleda
    wet: [[1550, 1750, 0.85], [3650, 3850, 0.70]],

    // Torres de cámaras de televisión oficiales FIA
    tvTowers: [
      [280, -1, 7.5, 6.5],   // Recta de meta
      [600, 1, 7.0, 6.5],    // Yokohama-S
      [950, -1, 7.5, 6.5],   // Mercedes-Arena Loop
      [1650, 1, 7.0, 6.5],   // Ford-Kurve
      [2200, -1, 8.0, 7.0],  // Dunlop-Kehre
      [2650, 1, 7.0, 6.5],   // Schumacher-S
      [3250, -1, 7.5, 6.5],  // Kumho-Kurve
      [4050, 1, 7.0, 6.5],   // Chicane Veedol
      [4400, -1, 7.0, 6.0]   // Coca-Cola-Kurve
    ],

    // Vallas publicitarias ADAC / Bilstein / Ravenol / Dekra / Rowe / H&R
    billboards: [
      [220, 480, -1, 20, 7.0, 1.60, 1.05, false],
      [1950, 2250, 1, 24, 7.0, 1.60, 1.05, false],
      [3400, 3680, -1, 22, 7.0, 1.60, 1.05, false],
      [4180, 4320, 1, 16, 7.0, 1.60, 1.05, false],
      [-120, -85, -1, 8, 7.0, 1.60, 1.05, false]
    ],

    // Pórticos sobre la pista
    gantries: [0, 2550],

    // Topografía orográfica de Eifel con vaguada en Dunlop-Kehre y colina del Castillo de Nürburg
    naturalH(x, z, s, d) {
      // 1. Colina volcánica del Castillo medieval de Nürburg (x=1050, z=-2150, cota +115m)
      const distToCastle = Math.hypot(x - 1050, z - (-2150));
      const castleHill = Math.max(0, 1.0 - distToCastle / 1600) * 115.0;
      // 2. Ondulaciones orográficas características del macizo de Hocheifel
      const eifelRidge = Math.sin(x * 0.0028 + 1.2) * 16.0 + Math.cos(z * 0.0024 - 0.8) * 14.0;
      // 3. Micro-relieve y taludes naturales
      const micro = Math.sin(x * 0.012 + z * 0.009) * 2.2;
      return eifelRidge + castleHill + micro;
    },

    // Poses de cámara cinematográficas para el modo foto / menú
    poses: [
      {
        nome: 'Parrilla de Salida (Haupttribüne)',
        tipo: 'coche',
        s: -18,
        d: -2.0,
        ojo: [-26.0, 3.2, 5.0],
        blanco: [-14.0, 0.9, -1.8],
        fov: 0.65
      },
      {
        nome: 'Mercedes-Arena (T3)',
        tipo: 'coche',
        s: 950,
        d: -1.0,
        ojo: [5.5, 2.8, -4.5],
        blanco: [0.0, 0.8, 0.0],
        fov: 0.55
      },
      {
        nome: 'Valle de Dunlop-Kehre (T7)',
        tipo: 'coche',
        s: 2200,
        d: -1.0,
        ojo: [-6.0, 2.2, 4.0],
        blanco: [0.0, 0.85, 0.0],
        fov: 0.52
      },
      {
        nome: 'Subida Schumacher-S (T8)',
        tipo: 'coche',
        s: 2650,
        d: 1.0,
        ojo: [4.8, 1.6, -4.0],
        blanco: [0.0, 0.8, 0.0],
        fov: 0.58
      }
    ],

    // =========================================================================
    // 100% AUTOCONTENIDO: CONSTRUCCIÓN DEL ESCENARIO DE NÜRBURGRING GP
    // =========================================================================
    buildProps(ctx) {
      const { mb, md, mp, S1, S2, SP, TRK, hw, frame, P, col, sign, REG, Bx, gantry, figure, sitter, stander, CROWD, mkRng, toStraight } = ctx;
      const rnd = typeof mkRng === 'function' ? mkRng(442) : Math.random;
      const PI = Math.PI, PI2 = PI * 2;
      const o5 = new Float64Array(5);

      // Paleta corporativa de Nürburgring y ADAC GT
      const colBilsteinYellow = [1.0, 0.88, 0.05];
      const colBilsteinBlue = [0.08, 0.32, 0.75];
      const colAdacYellow = [0.98, 0.82, 0.02];
      const colRavenolBlue = [0.05, 0.22, 0.65];
      const colSeatRed = [0.78, 0.12, 0.12];
      const colSeatWhite = [0.94, 0.94, 0.95];

      // -----------------------------------------------------------------------
      // 1. HAUPTTRIBÜNE (GRADA PRINCIPAL DE META T4a)
      // Situada en d = -15.5m a -42.0m, s = -90m a +135m (225 m de longitud)
      // Estructura abierta de 22 filas escalonadas, marquesina en voladizo,
      // asientos bicolor (Rojo/Blanco), pasillos y público de competición.
      // -----------------------------------------------------------------------
      {
        const st = TRK.stand;
        const u0 = st.s0, u1 = st.s1, vF = st.d0;
        const nRow = 22, run = 0.85, rise = 0.42, yF = 1.25;
        const vB = vF - 1.0 - nRow * run, yB = yF + nRow * rise;
        const nSec = 6, aisle = 2.4;
        const secW = (u1 - u0 - (nSec + 1) * aisle) / nSec;

        for (let sec = 0; sec < nSec; sec++) {
          const a = u0 + aisle + sec * (secW + aisle), c = a + secW;
          const v0 = mb.nv, i0 = mb.ni, w0 = md.nv, k0 = md.ni;

          // Huellas y contrahuellas de hormigón
          for (let r = 0; r < nRow; r++) {
            const v = vF - 1.0 - r * run, y = yF + r * rise, ao = 1.0 - 0.35 * (r / nRow);
            mb.mat(3); col(mb, 0.52, 0.53, 0.54, ao);
            mb.quad(a, y, v, c, y, v, c, y + rise, v, a, y + rise, v); // Frente
            mb.quad(a, y + rise, v, c, y + rise, v, c, y + rise, v - run, a, y + rise, v - run); // Peldaño

            // Asientos individuales Nürburgring (patrón rojo y blanco por sector)
            const sTone = (sec % 2 === 0) ? colSeatRed : colSeatWhite;
            md.mat(8); col(md, sTone[0], sTone[1], sTone[2], ao);
            md.quad(a, y + rise + 0.38, v - 0.22, c, y + rise + 0.38, v - 0.22, c, y + rise + 0.38, v - 0.72, a, y + rise + 0.38, v - 0.72, 0, 0, c - a, 0.5);
            md.quad(a, y + rise + 0.38, v - 0.72, c, y + rise + 0.38, v - 0.72, c, y + rise + 0.82, v - 0.74, a, y + rise + 0.82, v - 0.74, 0, 0, c - a, 0.44);
          }

          // Público en las gradas
          if (mp && SP && typeof sitter === 'function') {
            const pv0 = mp.nv, pi0 = mp.ni;
            for (let r = 0; r < nRow; r++) {
              const v = vF - 1.0 - r * run, y = yF + r * rise;
              const occ = 0.75 + 0.2 * Math.sin((r + 1) / (nRow + 1) * PI);
              for (let x = a + 0.4; x < c - 0.4; x += 0.55) {
                if (rnd() < occ) {
                  const crowdColor = (CROWD && CROWD.length) ? CROWD[Math.floor(rnd() * CROWD.length)] : [0.85, 0.2, 0.1];
                  if (rnd() < 0.12 && typeof stander === 'function') {
                    stander(x + (rnd() - 0.5) * 0.2, y + rise + 0.05, v - 0.45, crowdColor, 0.95);
                  } else {
                    sitter(x, y + rise + 0.38, v - 0.72, 0.95);
                  }
                }
              }
            }
            if (typeof toStraight === 'function') toStraight(mp, pv0);
            SP.add(mp, pi0, 1, 950);
          }

          // Escaleras laterales de acceso en cada sector
          for (const [x0, x1] of sec === 0 ? [[a - aisle, a], [c, c + aisle]] : [[c, c + aisle]]) {
            mb.mat(3); col(mb, 0.65, 0.65, 0.66, 0.9);
            for (let r = 0; r < nRow; r++) {
              const v = vF - 1.0 - r * run, y = yF + r * rise;
              mb.quad(x0, y, v, x1, y, v, x1, y + rise, v, x0, y + rise, v);
              mb.quad(x0, y + rise, v, x1, y + rise, v, x1, y + rise, v - run, x0, y + rise, v - run);
            }
            mb.mat(2, 102, 153); col(mb, 0.8, 0.8, 0.82);
            mb.tube([[(x0 + x1) / 2, yF + 0.95, vF - 1.0], [(x0 + x1) / 2, yB + 0.95, vB]], 0.035, 5);
          }

          // Murete frontal con vallas oficiales de Nürburgring
          const ea = sec === 0 ? u0 : a - aisle / 2, ec = sec === nSec - 1 ? u1 : c + aisle / 2;
          mb.mat(3); col(mb, 0.60, 0.60, 0.62);
          Bx(mb, ea, ec, -0.5, yF + 0.9, vF - 1.0, vF - 0.75);
          if (typeof sign === 'function') {
            const nm = ['name', 'b0', 'b5', 'b2', 'b7', 'name'][sec % 6];
            sign(md, ea + 2, 0.25, vF - 0.73, ec - ea - 4, 0, 0, 1.4, nm);
          }

          // Pared trasera y cerramiento
          mb.mat(3); col(mb, 0.48, 0.48, 0.50);
          mb.quad(ec, -0.5, vB - 0.3, ea, -0.5, vB - 0.3, ea, yB + 5.8, vB - 0.3, ec, yB + 5.8, vB - 0.3);
          mb.quad(ea, yB, vB, ec, yB, vB, ec, yB + 5.8, vB, ea, yB + 5.8, vB);

          // Marquesina de acero en voladizo (cantilever canopy)
          const yr0 = yB + 6.0, yr1 = yB + 3.8, vr1 = vF - 0.2;
          md.mat(9); col(md, 0.72, 0.74, 0.76);
          md.quad(ec, yr0, vB - 0.8, ea, yr0, vB - 0.8, ea, yr1, vr1, ec, yr1, vr1, 0, 0, ec - ea, vr1 - vB + 0.8);

          // Vigas y cerchas metálicas de soporte
          mb.mat(2, 128, 128); col(mb, 0.22, 0.24, 0.26);
          for (const x of [ea + 0.4, (ea + ec) / 2, ec - 0.4]) {
            Bx(mb, x - 0.22, x + 0.22, -0.5, yr0 - 0.1, vB - 0.3, vB + 0.15);
            const bm = mb.nv;
            Bx(mb, x - 0.12, x + 0.12, -0.5, 0.0, 0, 1);
            for (let q = bm; q < mb.nv; q++) {
              const t = mb.f32[q * 9 + 2], top = mb.f32[q * 9 + 1] > -0.25;
              mb.f32[q * 9 + 2] = lerp(vB - 0.3, vr1 - 0.3, t);
              mb.f32[q * 9 + 1] = lerp(yr0, yr1, t) - (top ? 0.06 : lerp(0.95, 0.3, t));
            }
          }

          if (typeof toStraight === 'function') {
            toStraight(mb, v0);
            toStraight(md, w0);
          }
          S1.add(mb, i0, 7, 2400);
          S2.add(md, k0, 7, 2400);
        }
      }

      // -----------------------------------------------------------------------
      // 2. MERCEDES-BENZ TRIBÜNE (T4 EN MERCEDES-ARENA)
      // Grada semicircular monumental que abraza el exterior del Mercedes-Arena (T2-T4)
      // s = 860m a 1060m (200m de desarrollo curvo envolvente), d = -25.0m a -44.0m
      // Conjunto arquitectónico completo según F1/FIA:
      // A. Estructura escalonada curva de hormigón de 20 filas (rise 0.44m, run 0.88m, desnivel 8.8m)
      // B. Asientos individuales en azul Mercedes-Benz / AMG (#0040a0) con público animado
      // C. Pasillos de acceso, escaleras vomitorias y barandillas metálicas de protección
      // D. Muro de contención frontal con pasamanos y paneles publicitarios de pista
      // E. Fachada posterior exterior acabada en paneles arquitectónicos blancos/metálicos
      // F. Pilares estructurales traseros de acero (pylons) con cerchas tubulares de celosía
      // G. Gran marquesina/cubierta metálica curva en voladizo (cantilever canopy)
      //    con cara superior de aluminio reflectante, cielo interior grafito y fascia perimetral
      //    frontal en azul corporativo Mercedes con rotulación y molduras de remate
      // -----------------------------------------------------------------------
      {
        const arenaS0 = 860, arenaS1 = 1060;
        const dS_arena = 6.0;
        const nS_arena = Math.round((arenaS1 - arenaS0) / dS_arena);
        const nArenaSteps = 20, stepRise = 0.44, stepRun = 0.88;
        const colSeatMercedesBlue = [0.05, 0.26, 0.76];
        const colRoofWhite = [0.93, 0.94, 0.96];
        const colFasciaBlue = [0.04, 0.16, 0.54];
        const colTrussSteel = [0.22, 0.24, 0.26];

        let mbI0 = mb.ni, mdI0 = md.ni, mpI0 = mp ? mp.ni : 0;
        let segCount = 0;

        for (let seg = 0; seg < nS_arena; seg++) {
          const sA = arenaS0 + seg * dS_arena, sB = arenaS0 + (seg + 1) * dS_arena;
          const isAisle = (seg % 5 === 0); // Cada 5 bloques se abre un pasillo/escalera vomitoria

          // Cota base del terreno en la primera fila
          const pA_frontGround = P(sA, -25.0), pB_frontGround = P(sB, -25.0);
          const yBaseA = pA_frontGround[1], yBaseB = pB_frontGround[1];

          // 1. Graderío escalonado de hormigón
          for (let r = 0; r < nArenaSteps; r++) {
            const dFront = -(25.0 + r * stepRun);
            const dBack = -(25.0 + (r + 1) * stepRun);
            const y0A = yBaseA + r * stepRise, y1A = y0A + stepRise;
            const y0B = yBaseB + r * stepRise, y1B = y0B + stepRise;

            const pA_f = P(sA, dFront), pB_f = P(sB, dFront);
            const pA_b = P(sA, dBack), pB_b = P(sB, dBack);

            // A. Contrahuella vertical de hormigón
            mb.mat(3); col(mb, 0.60, 0.61, 0.62, 1.0 - 0.25 * (r / nArenaSteps));
            mb.quad(pA_f[0], y0A, pA_f[2], pB_f[0], y0B, pB_f[2], pB_f[0], y1B, pB_f[2], pA_f[0], y1A, pA_f[2]);
            // B. Huella horizontal de hormigón
            mb.quad(pA_f[0], y1A, pA_f[2], pB_f[0], y1B, pB_f[2], pB_b[0], y1B, pB_b[2], pA_b[0], y1A, pA_b[2]);

            // C. Asientos individuales en azul oficial Mercedes-Benz (salvo en pasillos de acceso)
            if (!isAisle) {
              md.mat(8); col(md, colSeatMercedesBlue[0], colSeatMercedesBlue[1], colSeatMercedesBlue[2]);
              const pA_sf = P(sA, dFront - 0.14), pB_sf = P(sB, dFront - 0.14);
              const pA_sb = P(sA, dBack + 0.14), pB_sb = P(sB, dBack + 0.14);
              // Base del asiento
              md.quad(pA_sf[0], y1A + 0.36, pA_sf[2], pB_sf[0], y1B + 0.36, pB_sf[2], pB_sb[0], y1B + 0.36, pB_sb[2], pA_sb[0], y1A + 0.36, pA_sb[2]);
              // Respaldo ergonómico
              md.quad(pA_sb[0], y1A + 0.36, pA_sb[2], pB_sb[0], y1B + 0.36, pB_sb[2], pB_sb[0], y1B + 0.78, pB_sb[2], pA_sb[0], y1A + 0.78, pA_sb[2]);

              // Público animado en Mercedes-Arena
              if (mp && SP && typeof sitter === 'function' && rnd() < 0.65) {
                const pMid_s = P((sA + sB) * 0.5, (dFront + dBack) * 0.5);
                const yMid = (y1A + y1B) * 0.5;
                const crowdColor = (CROWD && CROWD.length) ? CROWD[Math.floor(rnd() * CROWD.length)] : [0.1, 0.3, 0.8];
                if (rnd() < 0.15 && typeof stander === 'function') {
                  stander(pMid_s[0], yMid + 0.05, pMid_s[2], crowdColor, 0.95);
                } else {
                  sitter(pMid_s[0], yMid + 0.36, pMid_s[2], 0.95);
                }
              }
            }
          }

          // 2. Pasillos y escaleras de acceso entre sectores
          if (isAisle) {
            const pA_midF = P((sA + sB) * 0.5, -25.0);
            const pA_midB = P((sA + sB) * 0.5, -(25.0 + nArenaSteps * stepRun));
            const yBot = (yBaseA + yBaseB) * 0.5 + 0.85;
            const yTop = yBot + nArenaSteps * stepRise;
            // Barandilla central de acero inoxidable en la escalera
            mb.mat(2, 120, 160); col(mb, 0.82, 0.84, 0.88);
            mb.tube([[pA_midF[0], yBot, pA_midF[2]], [pA_midB[0], yTop, pA_midB[2]]], 0.04, 5);
          }

          // 3. Muro perimetral frontal de seguridad
          {
            const pA_fw = P(sA, -24.8), pB_fw = P(sB, -24.8);
            mb.mat(3); col(mb, 0.64, 0.65, 0.66);
            mb.quad(pA_fw[0], yBaseA, pA_fw[2], pB_fw[0], yBaseB, pB_fw[2], pB_fw[0], yBaseB + 1.15, pB_fw[2], pA_fw[0], yBaseA + 1.15, pA_fw[2]);
            // Pasamanos tubular
            mb.mat(2, 100, 140); col(mb, 0.85, 0.86, 0.88);
            mb.tube([[pA_fw[0], yBaseA + 1.18, pA_fw[2]], [pB_fw[0], yBaseB + 1.18, pB_fw[2]]], 0.035, 5);
          }

          // 4. Fachada exterior trasera y cerramiento
          const dWallRear = -(25.0 + nArenaSteps * stepRun + 1.2);
          const yTopArenaA = yBaseA + nArenaSteps * stepRise + 1.2;
          const yTopArenaB = yBaseB + nArenaSteps * stepRise + 1.2;
          const pA_r0 = P(sA, dWallRear), pB_r0 = P(sB, dWallRear);
          mb.mat(2, 220, 220); col(mb, 0.90, 0.91, 0.94);
          mb.quad(pB_r0[0], yBaseB, pB_r0[2], pA_r0[0], yBaseA, pA_r0[2], pA_r0[0], yTopArenaA + 2.4, pA_r0[2], pB_r0[0], yTopArenaB + 2.4, pB_r0[2]);

          // 5. Pilares traseros de soporte de acero y cerchas
          if (seg % 4 === 0) {
            const pPylon = P(sA, dWallRear - 0.6);
            const yPylBot = yBaseA, yPylTop = yTopArenaA + 7.2;
            mb.mat(2, 128, 128); col(mb, colTrussSteel[0], colTrussSteel[1], colTrussSteel[2]);
            mb.cyl(pPylon[0], yPylBot, pPylon[2], 0.42, yPylTop, 0.38, 8, true, true);

            // Cercha diagonal que se proyecta hacia la cubierta en voladizo
            const pRoofFrontNode = P(sA, -27.5);
            const yRoofFrontNode = yTopArenaA + 4.2;
            mb.tube([[pPylon[0], yPylTop - 0.4, pPylon[2]], [pRoofFrontNode[0], yRoofFrontNode, pRoofFrontNode[2]]], 0.12, 6);
            mb.tube([[pPylon[0], yTopArenaA + 2.0, pPylon[2]], [pPylon[0] * 0.5 + pRoofFrontNode[0] * 0.5, yRoofFrontNode * 0.5 + (yTopArenaA + 5.5) * 0.5, pPylon[2] * 0.5 + pRoofFrontNode[2] * 0.5]], 0.08, 5);
          }

          // 6. GRAN CUBIERTA / MARQUESINA METÁLICA CURVA EN VOLADIZO (CANTILEVER CANOPY)
          {
            const dRoofFront = -27.2; // Vuela cubriendo casi todo el graderío hacia la pista
            const dRoofBack = dWallRear - 1.5;
            const yRoofBackA = yTopArenaA + 6.2, yRoofBackB = yTopArenaB + 6.2;
            const yRoofFrontA = yTopArenaA + 4.0, yRoofFrontB = yTopArenaB + 4.0;

            const pA_rf = P(sA, dRoofFront), pB_rf = P(sB, dRoofFront);
            const pA_rb = P(sA, dRoofBack), pB_rb = P(sB, dRoofBack);

            // A. Cara superior reflectante de aluminio blanco/plateado
            md.mat(9); col(md, colRoofWhite[0], colRoofWhite[1], colRoofWhite[2]);
            md.quad(pA_rf[0], yRoofFrontA, pA_rf[2], pB_rf[0], yRoofFrontB, pB_rf[2], pB_rb[0], yRoofBackB, pB_rb[2], pA_rb[0], yRoofBackA, pA_rb[2]);

            // B. Cara inferior (cielo visto desde la grada y la pista)
            mb.mat(3); col(mb, 0.32, 0.34, 0.36);
            mb.quad(pB_rf[0], yRoofFrontB - 0.35, pB_rf[2], pA_rf[0], yRoofFrontA - 0.35, pA_rf[2], pA_rb[0], yRoofBackA - 0.35, pA_rb[2], pB_rb[0], yRoofBackB - 0.35, pB_rb[2]);

            // C. Canto / Fascia frontal curva perimetral en Azul Mercedes
            mb.mat(17); col(mb, colFasciaBlue[0], colFasciaBlue[1], colFasciaBlue[2]);
            mb.quad(pA_rf[0], yRoofFrontA - 0.35, pA_rf[2], pB_rf[0], yRoofFrontB - 0.35, pB_rf[2], pB_rf[0], yRoofFrontB, pB_rf[2], pA_rf[0], yRoofFrontA, pA_rf[2]);

            // D. Borde lateral en los extremos de la grada
            if (seg === 0) {
              mb.quad(pA_rf[0], yRoofFrontA - 0.35, pA_rf[2], pA_rb[0], yRoofBackA - 0.35, pA_rb[2], pA_rb[0], yRoofBackA, pA_rb[2], pA_rf[0], yRoofFrontA, pA_rf[2]);
            } else if (seg === nS_arena - 1) {
              mb.quad(pB_rb[0], yRoofBackB - 0.35, pB_rb[2], pB_rf[0], yRoofFrontB - 0.35, pB_rf[2], pB_rf[0], yRoofFrontB, pB_rf[2], pB_rb[0], yRoofBackB, pB_rb[2]);
            }
          }

          segCount++;
          if (segCount % 6 === 0) {
            S1.add(mb, mbI0, 7, 2600);
            S2.add(md, mdI0, 7, 2600);
            if (mp && SP && mp.ni > mpI0) {
              SP.add(mp, mpI0, 1, 1400);
              mpI0 = mp.ni;
            }
            mbI0 = mb.ni; mdI0 = md.ni;
          }
        }

        // Flush final de la grada Mercedes-Benz
        if (mb.ni > mbI0) S1.add(mb, mbI0, 7, 2600);
        if (md.ni > mdI0) S2.add(md, mdI0, 7, 2600);
        if (mp && SP && mp.ni > mpI0) SP.add(mp, mpI0, 1, 1400);
      }

      // -----------------------------------------------------------------------
      // 3. EDIFICIO DE BOXES Y TORRE DE CONTROL DE NÜRBURGRING
      // s = -75m a +95m, d = 22.8m a 38.0m (33 boxes, 3 plantas, sala de control)
      // -----------------------------------------------------------------------
      {
        const pit = TRK.pit;
        const u0 = pit.bldS0, u1 = pit.bldS1, vF = pit.bldD0, vB = pit.bldD1;
        const nBay = 33, bw = (u1 - u0) / nBay;
        const hG = 4.2, hS = 5.2, hT = 9.8;
        const v0 = mb.nv, i0 = mb.ni, w0 = md.nv, k0 = md.ni;

        for (let b = 0; b < nBay; b++) {
          const a = u0 + b * bw, c = a + bw, closed = rnd() < 0.25;

          // Pilares estructurales de fachada
          mb.mat(3); col(mb, 0.62, 0.63, 0.64);
          Bx(mb, a - 0.22, a + 0.22, -0.5, hG, vF - 0.15, vF + 0.35);
          if (b === nBay - 1) Bx(mb, c - 0.22, c + 0.22, -0.5, hG, vF - 0.15, vF + 0.35);

          // Dintel publicitario con colores de equipos
          const teamCol = [
            [0.12, 0.45, 0.95], // Bilstein Blue
            [0.98, 0.85, 0.05], // ADAC Yellow
            [0.85, 0.12, 0.12], // Rowe Red
            [0.10, 0.68, 0.35]  // Dekra Green
          ][b % 4];
          mb.mat(17); col(mb, teamCol[0], teamCol[1], teamCol[2]);
          Bx(mb, a, c, hG, hS, vF - 0.12, vF + 0.35);

          // Taller interior de boxes
          const dp = 7.5, x0 = a + 0.25, x1 = c - 0.25;
          mb.mat(3); col(mb, 0.38, 0.38, 0.39, 0.8);
          mb.quad(x0, 0.02, vF + dp, x1, 0.02, vF + dp, x1, 0.02, vF, x0, 0.02, vF); // Suelo
          mb.quad(x1, 0, vF + dp, x0, 0, vF + dp, x0, hG, vF + dp, x1, hG, vF + dp); // Fondo
          mb.quad(x0, 0, vF + dp, x0, 0, vF, x0, hG, vF, x0, hG, vF + dp); // Lateral izq
          mb.quad(x1, 0, vF, x1, 0, vF + dp, x1, hG, vF + dp, x1, hG, vF); // Lateral der

          if (!closed) {
            // Carros de herramientas y mecánicos
            mb.mat(2, 110, 150); col(mb, teamCol[0] * 0.8, teamCol[1] * 0.8, teamCol[2] * 0.8);
            Bx(mb, x0 + 0.4, x0 + 1.6, 0.0, 1.05, vF + dp - 1.1, vF + dp - 0.4);
            // Neumáticos slick apilados
            mb.mat(4); col(mb, 0.02, 0.02, 0.02);
            mb.cyl(x1 - 0.6, 0, vF + 1.2, 0.32, 0.85, 0.32, 10, false, true);
          } else {
            // Portón seccional cerrado
            mb.mat(13); col(mb, 0.70, 0.72, 0.74);
            mb.quad(x1, 0, vF + 0.1, x0, 0, vF + 0.1, x0, hG, vF + 0.1, x1, hG, vF + 0.1);
          }
        }

        // Planta VIP superior y terrazas de observación
        mb.mat(3); col(mb, 0.58, 0.58, 0.59);
        Bx(mb, u0, u1, hS, hS + 0.35, vF - 1.8, vB);
        // Barandilla acristalada de terraza
        mb.mat(5); col(mb, 1, 1, 1);
        mb.quad(u1, hS + 0.35, vF - 1.75, u0, hS + 0.35, vF - 1.75, u0, hS + 1.45, vF - 1.75, u1, hS + 1.45, vF - 1.75);
        // Fachada acristalada superior
        mb.quad(u1, hS + 0.35, vF + 1.0, u0, hS + 0.35, vF + 1.0, u0, hT, vF + 1.0, u1, hT, vF + 1.0);

        // Torre de Control de Carrera (Rennleitung) en el extremo de boxes (u0)
        const tu0 = u0 - 8.5, tu1 = u0 + 4.5, tv0 = vF - 3.5, tv1 = vF + 4.5;
        mb.mat(3); col(mb, 0.35, 0.36, 0.38);
        Bx(mb, tu0, tu1, 0, 18.5, tv0, tv1);
        // Sala panorámica de comisarios en voladizo en la azotea
        mb.mat(5); col(mb, 1, 1, 1);
        mb.quad(tu1 + 1.2, 14.5, tv0 - 1.2, tu0 - 1.2, 14.5, tv0 - 1.2, tu0 - 1.2, 18.0, tv0 - 1.2, tu1 + 1.2, 18.0, tv0 - 1.2);
        // Antenas de cronometraje
        mb.mat(1, 0, 0, 80); col(mb, 0.9, 0.9, 0.9);
        mb.cyl((tu0 + tu1) / 2, 18.5, (tv0 + tv1) / 2, 0.12, 26.5, 0.04, 6, false, true);

        if (typeof toStraight === 'function') {
          toStraight(mb, v0);
          toStraight(md, w0);
        }
        S1.add(mb, i0, 7, 2600);
        S2.add(md, k0, 7, 1200);

        // Muro de boxes (Pit Wall) con pantallas de telemetría y murete
        const pwI0 = mb.ni;
        const pwF = pit.wallD;
        for (let s = pit.bldS0 - 10; s <= pit.bldS1 + 10; s += 4.5) {
          at(mb, s, pwF, 0, m => {
            m.mat(3); col(m, 0.65, 0.66, 0.68);
            Bx(m, -2.25, 2.25, 0.0, 1.05, -0.35, 0.35);
            // Puesto de ingenieros con marquesina y pantallas
            m.mat(2, 128, 128); col(m, 0.15, 0.16, 0.18);
            Bx(m, -1.2, 1.2, 1.05, 2.6, 0.1, 0.95);
            m.mat(6, 220, 0); col(m, 0.2, 0.8, 1.0); // Monitores
            Bx(m, -1.1, 1.1, 1.4, 2.1, 0.08, 0.12);
          });
        }
        S1.add(mb, pwI0, 7, 1800);
      }

      // -----------------------------------------------------------------------
      // 4. BURG NÜRBURG (CASTILLO MEDIEVAL EN LA CIMA SUR DE EIFEL)
      // Situado en x = 1050m, z = -2150m, y = +115m (cumbre del horizonte sur)
      // Torre circular de homenaje (Bergfried, r=6.5m, h=24m), muralla almenada,
      // contrafuertes de basalto volcánico y bandera alemana en el mástil.
      // -----------------------------------------------------------------------
      {
        const cstI0 = mb.ni;
        const cx = 1050.0, cz = -2150.0;
        const cy = TRK.spec && typeof TRK.spec.naturalH === 'function' ? TRK.spec.naturalH(cx, cz) : 115.0;

        // Torre cilíndrica del homenaje (Bergfried)
        mb.mat(3); col(mb, 0.44, 0.42, 0.40);
        mb.cyl(cx, cy, cz, 6.5, cy + 24.0, 6.0, 16, true, true);

        // Almenas superiores defensivas
        for (let i = 0; i < 12; i++) {
          const ang = (i / 12) * PI2;
          const ax = cx + Math.cos(ang) * 6.1, az = cz + Math.sin(ang) * 6.1;
          Bx(mb, ax - 0.7, ax + 0.7, cy + 24.0, cy + 25.8, az - 0.7, az + 0.7);
        }

        // Mástil y bandera de Nürburg
        mb.mat(1); col(mb, 0.85, 0.85, 0.85);
        mb.cyl(cx, cy + 24.0, cz, 0.12, cy + 34.0, 0.06, 6, false, true);
        mb.mat(17); col(mb, 0.85, 0.15, 0.12);
        Bx(mb, cx, cx + 3.2, cy + 30.5, cy + 33.5, cz - 0.05, cz + 0.05);

        // Muralla almenada cuadrangular circundante (45m x 38m)
        const hw_wall = 22.0, hd_wall = 19.0, h_wall = 8.5;
        mb.mat(3); col(mb, 0.40, 0.38, 0.36);
        Bx(mb, cx - hw_wall, cx + hw_wall, cy, cy + h_wall, cz - hd_wall, cz - hd_wall + 2.5); // Norte
        Bx(mb, cx - hw_wall, cx + hw_wall, cy, cy + h_wall, cz + hd_wall - 2.5, cz + hd_wall); // Sur
        Bx(mb, cx - hw_wall, cx - hw_wall + 2.5, cy, cy + h_wall, cz - hd_wall, cz + hd_wall); // Oeste
        Bx(mb, cx + hw_wall - 2.5, cx + hw_wall, cy, cy + h_wall, cz - hd_wall, cz + hd_wall); // Este

        // Torreones esquineros de la muralla
        for (const [tx, tz] of [[-hw_wall, -hd_wall], [hw_wall, -hd_wall], [hw_wall, hd_wall], [-hw_wall, hd_wall]]) {
          mb.cyl(cx + tx, cy, cz + tz, 3.2, cy + 11.0, 3.0, 10, true, true);
        }

        S1.add(mb, cstI0, 7, 5000); // Visible hasta 5.000 m en el horizonte
      }

      // -----------------------------------------------------------------------
      // 5. BORDILLOS DISUASORIOS (SAUSAGE KERBS) EN CHICANE VEEDOL (T13 - T14)
      // Rampas trapezoidales amarillas en los vértices interiores de corte
      // -----------------------------------------------------------------------
      {
        const skI0 = mb.ni;
        for (const [sK, sideK] of [[4045, -1], [4095, 1]]) {
          const pApex = P(sK, sideK * (hw + 0.95));
          mb.push(frame(sK, sideK * (hw + 0.95), 0, 0));
          mb.mat(2, 240, 0); col(mb, 0.98, 0.85, 0.02); // Amarillo disuasorio
          Bx(mb, -4.5, 4.5, 0.0, 0.075, -0.45, 0.45);
          mb.pop();
        }
        S1.add(mb, skI0, 7, 650);
      }

      // -----------------------------------------------------------------------
      // 6. LOGÍSTICA DE PADDOCK Y CAMIONES DE EQUIPOS GT3
      // -----------------------------------------------------------------------
      {
        const padI0 = mb.ni;
        const truck = (m, c) => {
          m.mat(2, 89, 51); col(m, c[0], c[1], c[2]);
          Bx(m, -6.5, 3.2, 1.25, 4.0, -1.25, 1.25);
          col(m, 0.88, 0.88, 0.88);
          Bx(m, 3.6, 5.9, 0.9, 3.3, -1.2, 1.2);
          m.mat(2, 153, 76); col(m, 0.1, 0.1, 0.12);
          Bx(m, -6.3, 5.6, 0.75, 1.25, -1.1, 1.1);
        };
        const truckCols = [colBilsteinBlue, colAdacYellow, [0.85, 0.85, 0.85], [0.12, 0.12, 0.14]];
        [[-48, 42, 0.04], [-18, 43, -0.03], [15, 41.5, 3.12], [48, 43, 0.02]].forEach(([s, d, yaw], q) => {
          at(mb, s, d, yaw, m => truck(m, truckCols[q]));
        });
        S1.add(mb, padI0, 7, 1400);
      }

      // -----------------------------------------------------------------------
      // 7. CARTELERÍA OFICIAL FIA DE DISTANCIA DE FRENADA (200m, 150m, 100m, 50m)
      // Instalados perpendicularmente al flujo de pista en las grandes frenadas
      // -----------------------------------------------------------------------
      {
        const brkI0 = mb.ni, brkD0 = md.ni;
        const addBrakingZone = (sApex, side) => {
          for (const dM of [200, 150, 100, 50]) {
            const sB = sApex - dM;
            const p = P(sB, side * (hw + 2.4));
            const tx = p[3], tz = p[4];
            // Normal exterior
            const inX = tz * side, inZ = -tx * side;
            const outX = -inX, outZ = -inZ;
            const x = p[0], y = p[1], z = p[2];

            // Mástil de acero galvanizado
            mb.mat(1); col(mb, 0.76, 0.77, 0.80);
            mb.cyl(x, y, z, 0.07, y + 1.85, 0.07, 6, true, true);

            // Panel blanco reflectante perpendicular a la pista
            const bW = 0.65, bH = 0.95;
            const yB = y + 0.85;
            const pL_x = x - outX * bW, pL_z = z - outZ * bW;
            const pR_x = x + outX * bW, pR_z = z + outZ * bW;

            // Cara frontal mirando hacia los bólidos en aproximación
            md.mat(2, 240, 240); col(md, 0.96, 0.97, 0.98);
            md.quad(pL_x, yB, pL_z, pR_x, yB, pR_z, pR_x, yB + bH, pR_z, pL_x, yB + bH, pL_z);

            // Marco y bandas de contraste
            md.mat(4); col(md, 0.08, 0.08, 0.10);
            md.quad(pL_x, yB + bH - 0.08, pL_z, pR_x, yB + bH - 0.08, pR_z, pR_x, yB + bH, pR_z, pL_x, yB + bH, pL_z);
            md.quad(pL_x, yB, pL_z, pR_x, yB, pR_z, pR_x, yB + 0.08, pR_z, pL_x, yB + 0.08, pL_z);
          }
        };

        // Curva 1: Yokohama-S (frenada exterior izquierdo side = -1)
        addBrakingZone(524, -1);
        // Curva 7: Dunlop-Kehre (frenada exterior derecho side = 1)
        addBrakingZone(2121, 1);
        // Curva 13: Chicane Veedol (frenada exterior izquierdo side = -1)
        addBrakingZone(4029, -1);

        S1.add(mb, brkI0, 7, 1200);
        S2.add(md, brkD0, 7, 1200);
      }

      // -----------------------------------------------------------------------
      // 8. BARRERAS DE SEGURIDAD FIA: GUARDARRAÍL ARMCO TRIPLE Y VALLA METÁLICA
      // Protección de escapatorias exteriores clave de Nürburgring GP
      // -----------------------------------------------------------------------
      {
        const fiaI0 = mb.ni, fiaD0 = md.ni;
        const zones = [
          [510, 640, -1],   // Yokohama-S
          [860, 1060, -1],  // Mercedes-Arena (frente a la grada)
          [1620, 1720, 1],  // Ford-Kurve
          [2100, 2300, 1],  // Dunlop-Kehre
          [2520, 2740, -1], // Schumacher-S
          [4010, 4170, -1]  // Chicane Veedol
        ];

        for (const [zS0, zS1, side] of zones) {
          const segStep = 5.0;
          const nSeg = Math.round((zS1 - zS0) / segStep);
          for (let st = 0; st < nSeg; st++) {
            const s0 = zS0 + st * segStep, s1 = zS0 + (st + 1) * segStep;
            const d = side * (hw + 3.8);
            const p0 = P(s0, d), p1 = P(s1, d);

            // Muro / Guardarraíl metálico de 1.1m
            mb.mat(1); col(mb, 0.72, 0.74, 0.78);
            mb.quad(p0[0], p0[1], p0[2], p1[0], p1[1], p1[2], p1[0], p1[1] + 1.1, p1[2], p0[0], p0[1] + 1.1, p0[2]);

            // Poste de soporte cada tramo
            mb.cyl(p0[0], p0[1], p0[2], 0.08, p0[1] + 3.4, 0.07, 6, true, true);

            // Valla metálica superior FIA (Catch fencing) de 2.3m
            md.mat(7); col(md, 0.60, 0.62, 0.65, 0.55);
            md.quad(p0[0], p0[1] + 1.1, p0[2], p1[0], p1[1] + 1.1, p1[2], p1[0], p1[1] + 3.4, p1[2], p0[0], p0[1] + 3.4, p0[2]);
          }
        }
        S1.add(mb, fiaI0, 7, 1800);
        S2.add(md, fiaD0, 7, 1800);
      }

      function at(targetMB, s, d, yaw, fn) {
        const p = P(s, d);
        let tx = p[3], tz = p[4];
        if (yaw) {
          const c = Math.cos(yaw), sn = Math.sin(yaw);
          const a = tx * c - tz * sn, b = tx * sn + tz * c;
          tx = a; tz = b;
        }
        const m = m4basis(m4(), tx, 0, tz, 0, 1, 0, -tz, 0, tx, p[0], p[1], p[2]);
        targetMB.push(m);
        fn(targetMB);
        targetMB.pop();
      }
    }
  });
})();
