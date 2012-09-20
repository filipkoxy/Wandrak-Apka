
var wandrakDB = {};
var DB_UNSAVED_ITEM_KEY_LIST = "offlineItemKeyList";
var DB_ITEM_PREFIX_KEY = "offlineItemPrefix";
var DB_LOCAL_POI_LAST_ID = "offlineLocalPoiLastId";

var DB_OFFLINE_PAGE_KEY = "offlinePageJson";
var DB_OFFLINE_POI_PREFIX_KEY = "offlinePoiPrefix";

function db_canStoreToServer() {
	if (navigator && navigator.network) {
		return navigator.network.connection.type != Connection.NONE;
	} else {
		return true;
	}
}

function db_nextLocalPoiId() {
	var lastId = window.localStorage.getItem(DB_LOCAL_POI_LAST_ID);

	if (!lastId) {
		lastId = 1;
		window.localStorage.setItem(DB_LOCAL_POI_LAST_ID, lastId);
	}

	lastId++;
	window.localStorage.setItem(DB_LOCAL_POI_LAST_ID, lastId);

	return 'local' + lastId;
}

function db_storeItem(item) {
	var keysToSend = JSON.parse(window.localStorage.getItem(DB_UNSAVED_ITEM_KEY_LIST));

	if (keysToSend == null) {
		keysToSend = {};
		window.localStorage.setItem(DB_UNSAVED_ITEM_KEY_LIST, JSON.stringify(keysToSend));
	}

	var storeItemKey = DB_ITEM_PREFIX_KEY + item.localId;
	var currentItemValue = window.localStorage.getItem(storeItemKey);
	if (currentItemValue && currentItemValue.redirect) {
		storeItemKey = currentItemValue.redirect;
	}
	window.localStorage.setItem(storeItemKey, JSON.stringify(item));
	keysToSend[item.localId] = item.localId;
	window.localStorage.setItem(DB_UNSAVED_ITEM_KEY_LIST, JSON.stringify(keysToSend));

	return storeItemKey;
}

function db_readItems() {
	var keysToSend = JSON.parse(window.localStorage.getItem(DB_UNSAVED_ITEM_KEY_LIST));

	if (keysToSend == null) {
		return [];
	}

	var items = [];

	$.each(keysToSend, function (itemKey, value) {
		items.push(db_readItem(itemKey));
	});

	return items;
}

function db_readItem(dbKey) {
	var storeItemKey = DB_ITEM_PREFIX_KEY + dbKey;
	return JSON.parse(window.localStorage.getItem(storeItemKey));
}

function db_clearData() {
	var keysToSend = JSON.parse(window.localStorage.getItem(DB_UNSAVED_ITEM_KEY_LIST));
	window.localStorage.removeItem(DB_UNSAVED_ITEM_KEY_LIST);

	if (keysToSend == null) {
		return;
	}

	$.each(keysToSend, function (itemKey, value) {
		if (itemKey && itemKey.indexOf('local') < 0) {
			var storeItemKey = DB_ITEM_PREFIX_KEY + itemKey;
			window.localStorage.removeItem(storeItemKey);
		}
	});
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
		    		if (item.localId && item.localId.indexOf && item.localId.indexOf('local') >= 0) {
			    		var storeItemKey = DB_ITEM_PREFIX_KEY + item.localId;
			    		item.redirect = data.post.id;
			    		window.localStorage.setItem(storeItemKey, JSON.stringify(item));
		    		}

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

function db_message(msg, timeout) {
	$(".msg_box").show();
	$(".msg_box").html(msg);

	if (timeout == null) {
		timeout = 13000;
	}

	setTimeout(function() { $(".msg_box").hide(); }, timeout);
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
		poisCleared.push({ id: post.id, title: post.title, content: post.content, localId: post.localId, custom_fields: post.custom_fields });
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
