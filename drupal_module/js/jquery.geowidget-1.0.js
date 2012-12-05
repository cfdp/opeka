(function($){

	iplocate =  function(n, callback){
		$.ajax({dataType:'jsonp',url:'http://api.ipinfodb.com/v2/ip_query.php',data:'key='+n.ipinfodbKey+'&ip='+n.ip+'&output=json&timezone=false',success:function(a,b,c){
			var d;
			var e;
			var f;
			var g;
			var h;
			var i=a.Status;
			if(i=='OK'){
				e=a.Latitude;
				f=a.Longitude;
				d=a.City;
				if(d!=undefined&&a.CountryName!=undefined)
					d=d+', '+a.CountryName;
			}else{
				if(i=='MISSING API KEY'||n.ipinfodbKey==''){
					g=i;
					h='Missing ipinfodb API key, please register one for free: http://ipinfodb.com/'
				}else if(i.substr(0,12)=='IP NOT FOUND'){
					g=i;
					h='ipinfodb service cound not found IP '+n.ip;
				}else{
					g=i;
					h='ipinfodb service was not successful for IP '+n.ip;
				}
			}
			callback(d,e,f,g,h);
		}
		});
	};
})(jQuery);