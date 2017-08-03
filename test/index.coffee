rules = require '../'

conditions = [
  {
    before:
      $set:
        '@deadline': "{{ deadlineAt | amTimezone : timezone }}"
        '@day': '{{ @deadline | amISOWeekday }}'
    if:
      '@day':
        $gt: 5
    then:
      $set:
        '@deadline': "{{ @deadline | amSubtract : @day - 5 : 'days' | amSet : 'hour' : 19 | amSet : 'minute' : 0 }}"
  }
  {
    then:
      $set:
        '@deadline': "{{ @deadline | amAddDuration : @duration }}"
  }
  {
    if:
      '@deadline':
        $between: [ '14:00:00', '23:59:00' ]
    then:
      $set:
        '@deadline': "{{ @deadline | amSet : 'hour' : 14 | amSet : 'minute' : 0 }}"
  }
  {
    if:
      '@deadline':
        $between: [ '17:00:00', '23:59:59' ]
    then:
      $set:
        '@deadline': "{{ @deadline | amSet : 'hour' : 17 | amSet: 'minute' : 0 }}"
  }
  {
    if:
      '@deadline':
        $between: [ '00:00:00', '05:59:00' ]
    then:
      $set:
        '@deadline': "{{ @deadline | amSubtract: 1 : 'day' | amSet: 'hour' : 14 | amSet: 'minute' : 0 }}"
  }
  {
    if:
      '@deadline':
        $between: [ '00:00:00', '08:59:00' ]
    then:
      $set:
        '@deadline': "{{ @deadline | amSubtract: 1 : 'day' | amSet: 'hour' : 17 | amSet: 'minute' : 0 }}"
  }
  {
    before:
      $set:
        '@day': '{{ @deadline | amISOWeekday }}'
    if:
      '@day':
        $gt: 5
    then:
      $set:
        '@deadline': "{{ @deadline | amSubtract : 2 : 'days' }}"
  }
]

context = 
  id: ' 1'
  duration: "P-1DT22H15M"

scope =
  deadlineAt: '2017-06-27T08:02:00.000+0000'
  timezone: 'Australia/Sydney'

r = rules conditions, scope, context 

console.log r

context = 
  id: ' 2'
  duration: "P-1DT22H15M"

scope =
  deadlineAt: '2016-10-21T15:30:00.000+0000'
  timezone: 'Australia/Sydney'

r = rules conditions, scope, context

console.log r
