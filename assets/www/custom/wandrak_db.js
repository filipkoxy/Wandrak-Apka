
var wandrakDB = {};
var DB_ITEM_CNT_KEY = "offlineItemCnt";
var DB_ITEM_PREFIX_KEY = "offlineItemPrefix";

var DB_OFFLINE_PAGE_KEY = "offlinePageJson";
var DB_OFFLINE_POI_PREFIX_KEY = "offlinePoiPrefix";

function db_canStoreToServer() {
	if (navigator && navigator.network) {
		return navigator.network.connection.type != Connection.NONE;
	} else {
		return true;
	}
}

function db_storeItem(item) {
	var itemCnt = window.localStorage.getItem(DB_ITEM_CNT_KEY);

	if (!itemCnt) {
		window.localStorage.setItem(DB_ITEM_CNT_KEY, 0);
		itemCnt = window.localStorage.getItem(DB_ITEM_CNT_KEY);
	}

	window.localStorage.setItem(DB_ITEM_PREFIX_KEY + itemCnt, JSON.stringify(item));
	itemCnt++;
	window.localStorage.setItem(DB_ITEM_CNT_KEY, itemCnt);
}

function db_readItems() {
	var items = [];

	var itemCnt = window.localStorage.getItem(DB_ITEM_CNT_KEY);
	if (itemCnt) {
		for (i=0; i < itemCnt; i++) {
			items.push(JSON.parse(window.localStorage.getItem(DB_ITEM_PREFIX_KEY + i)));
		}
	}

	return items;
}

function db_clearData() {
	var itemCnt = window.localStorage.getItem(DB_ITEM_CNT_KEY);
	window.localStorage.removeItem(DB_ITEM_CNT_KEY);
	if (itemCnt) {
		for (i=0; i < itemCnt; i++) {
			window.localStorage.removeItem(DB_ITEM_PREFIX_KEY + i);
		}
	}
}

function db_trySendItems(finish_callback) {
	var items = db_readItems();

	if (!db_canStoreToServer()) {
		db_message("Internet not available. Stored locally for future upload.");
		return;
	}

	db_sendItemRecc({ items: items, pos: 0, finish_callback: finish_callback });
}

function db_sendItemRecc(statusObj) {
	if (statusObj.items.length > statusObj.pos) {
		var item = statusObj.items[statusObj.pos];

		$.ajax({
		    url: item.url,
		    type: 'GET',
		    dataType: 'json',
		    success: function (data) {
		    	if (data.status == 'ok') {
		    		statusObj.pos = statusObj.pos + 1;
		    		setTimeout(function() { db_sendItemRecc(statusObj) }, 10);
		    		return;
		    	}
				db_message('Failed to store data!');
				db_sendItemClearSent(statusObj);
				if (statusObj.finish_callback) {
					statusObj.finish_callback();
				}
		    },
		    error: function () {
				db_message('Failed to store data!');
				db_sendItemClearSent(statusObj);
				if (statusObj.finish_callback) {
					statusObj.finish_callback();
				}
		    }
		});
	} else {
		db_message('Data stored.');
		db_sendItemClearSent(statusObj);
		if (statusObj.finish_callback) {
			statusObj.finish_callback();
		}
	}
}

function db_sendItemClearSent(statusObj) {
	db_clearData();
	if (statusObj.items.length > statusObj.pos) {
		for (i = statusObj.pos; i < statusObj.items.length; i++) {
			var item = statusObj.items[statusObj.pos];
			db_storeItem(item);
		}
	}
}

function db_message(msg) {
	$(".msg_box").show();
	$(".msg_box").html(msg);
	setTimeout(function(){ $(".msg_box").hide(); }, 13000);
}

function db_storePages(pagesJson) {
	var postsCleared = [];
	$.each(pagesJson, function (key, post) {
		postsCleared.push({ id: post.id, title: post.title });
	});

	window.localStorage.setItem(DB_OFFLINE_PAGE_KEY, JSON.stringify(postsCleared));
}

function db_loadPages() {
	var pagesStr = window.localStorage.getItem(DB_OFFLINE_PAGE_KEY);
	if (pagesStr) {
		return JSON.parse(pagesStr);
	}
	return null;
}

function db_storePois(pageId, poisJson) {
	var poisCleared = [];
	$.each(poisJson.children, function (key, post) {
		poisCleared.push({ id: post.id, title: post.title, content: post.content });
	});
	var pageData = { id: poisJson.id, title: poisJson.title, children: poisCleared };
	window.localStorage.setItem(DB_OFFLINE_POI_PREFIX_KEY + pageId, JSON.stringify(pageData));
}

function db_loadPois(pageId) {
	var poisStr = window.localStorage.getItem(DB_OFFLINE_POI_PREFIX_KEY + pageId);
	if (poisStr) {
		return JSON.parse(poisStr);
	}
	return null;
}
